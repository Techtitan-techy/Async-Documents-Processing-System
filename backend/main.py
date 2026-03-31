import os
import shutil
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import EventSourceResponse, StreamingResponse
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import json
import redis
import csv
import io

from database import engine, Base, get_db
from models.document import Document, ProcessingResult, CorrectionEvent
from schemas.document import DocumentResponse, ProcessingResultResponse
from tasks import process_document
import uuid

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Async Document Processing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        doc_id = str(uuid.uuid4())
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{doc_id}_{file.filename}")
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        doc = Document(id=doc_id, filename=file.filename, status="pending")
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        process_document.delay(doc_id, file_path)
        
        return {"id": doc_id, "filename": file.filename, "status": "pending"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")

@app.get("/documents")
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return docs

@app.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    result = db.query(ProcessingResult).filter(ProcessingResult.document_id == document_id).first()
    return {"document": doc, "result": result}

@app.get("/documents/{document_id}/progress")
async def document_progress(document_id: str, request: Request):
    async def event_generator():
        pubsub = redis_client.pubsub()
        channel = f"doc_progress:{document_id}"
        pubsub.subscribe(channel)
        try:
            while True:
                if await request.is_disconnected():
                    break
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    data = json.loads(message["data"])
                    yield {"data": json.dumps(data)}
                    if data["status"] in ["completed", "failed"]:
                        break
        finally:
            pubsub.unsubscribe(channel)
    return EventSourceResponse(event_generator())

@app.post("/documents/{document_id}/retry")
def retry_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = "pending"
    db.commit()
    file_path = os.path.join("uploads", f"{doc_id}_{doc.filename}")
    process_document.delay(doc_id, file_path)
    return {"message": "Retry initiated"}

@app.put("/documents/{document_id}/result")
def update_result(document_id: str, updates: dict, db: Session = Depends(get_db)):
    # Simple manual update implementation and correction event logging
    result = db.query(ProcessingResult).filter(ProcessingResult.document_id == document_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    for field, new_value in updates.items():
        if hasattr(result, field):
            old_value = getattr(result, field)
            if old_value != new_value:
                setattr(result, field, new_value)
                event = CorrectionEvent(
                    result_id=result.id,
                    field_name=field,
                    edit_type="substitution",
                    old_value=str(old_value) if old_value else None,
                    new_value=str(new_value) if new_value else None
                )
                db.add(event)
                # re-trigger kieval alignments conceptually
                result.kieval_aligned = min(1.0, (result.kieval_aligned or 0.8) + 0.05)
    db.commit()
    return {"message": "Result updated"}

@app.post("/documents/{document_id}/finalize")
def finalize_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = "finalized"
    db.commit()
    return {"message": "Document finalized"}

@app.get("/documents/{document_id}/export")
def export_document(document_id: str, db: Session = Depends(get_db)):
    result = db.query(ProcessingResult).filter(ProcessingResult.document_id == document_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Category", "Summary", "Keywords"])
    writer.writerow([result.title, result.category, result.summary, ",".join(result.keywords or [])])
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=document_{document_id}.csv"}
    )
    return response

@app.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # 1. Try to delete physical file if it exists
    filepath = os.path.join("uploads", f"{document_id}_{doc.filename}")
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error deleting file: {e}")

    # 2. Delete database records (Cascading will handle results/events if defined correctly, but let's be explicit)
    result = db.query(ProcessingResult).filter(ProcessingResult.document_id == document_id).first()
    if result:
        db.query(CorrectionEvent).filter(CorrectionEvent.result_id == result.id).delete()
        db.delete(result)
    
    db.delete(doc)
    db.commit()
    return {"message": "Document and all analytical records deleted successfully"}
