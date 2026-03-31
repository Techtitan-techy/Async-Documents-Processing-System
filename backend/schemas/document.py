from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any

class ExtractedDataSchema(BaseModel):
    title: str = Field(..., description="The title of the document")
    category: str = Field(..., description="The type/category of the document (e.g., Invoice, Memo, Contract)")
    summary: str = Field(..., description="A short summary of the document contents")
    keywords: List[str] = Field(default_factory=list, description="A list of keywords from the document")

class LLMResponseSchema(BaseModel):
    extracted_data: ExtractedDataSchema
    confidence_scores: Dict[str, float] = Field(..., description="Confidence score for each extracted field (title, category, summary, keywords)")

class DocumentResponse(BaseModel):
    id: str
    filename: str
    status: str
    model_config = ConfigDict(from_attributes=True)

class ProcessingResultResponse(BaseModel):
    id: int
    document_id: str
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    confidence_scores: Optional[Dict[str, float]] = None
    raw_result: Optional[Dict[str, Any]] = None
    validation_errors: Optional[List[str]] = None
    entity_f1: Optional[float] = None
    kieval_entity_f1: Optional[float] = None
    group_f1: Optional[float] = None
    kieval_aligned: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)
