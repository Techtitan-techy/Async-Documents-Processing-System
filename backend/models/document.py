from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True) # Could use UUID string or NanoID
    filename = Column(String, index=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    results = relationship("ProcessingResult", back_populates="document", uselist=False)

class ProcessingResult(Base):
    __tablename__ = "processing_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id"))
    
    # Extracted Fields
    title = Column(String, nullable=True)
    category = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, nullable=True) # list of strings
    
    # Confidence metrics per field (JSON mapping field -> score)
    confidence_scores = Column(JSON, nullable=True)
    
    # Raw and validation
    raw_result = Column(JSON, nullable=True)
    validation_errors = Column(JSON, nullable=True) # list of errors if schema failed
    
    # KIE Metrics
    entity_f1 = Column(Float, nullable=True)
    kieval_entity_f1 = Column(Float, nullable=True)
    group_f1 = Column(Float, nullable=True)
    kieval_aligned = Column(Float, nullable=True)

    document = relationship("Document", back_populates="results")
    corrections = relationship("CorrectionEvent", back_populates="result")

class CorrectionEvent(Base):
    __tablename__ = "correction_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    result_id = Column(Integer, ForeignKey("processing_results.id"))
    field_name = Column(String, index=True)
    edit_type = Column(String) # substitution, addition, deletion
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    result = relationship("ProcessingResult", back_populates="corrections")
