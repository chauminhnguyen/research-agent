import asyncio
from typing import Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_openai import OpenAIEmbeddings

from app.config import get_settings

settings = get_settings()


class VectorMemory:
    def __init__(self):
        self._client = None
        self._embeddings = None

    @property
    def client(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry_opt_out=True)
            )
        return self._client

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = OpenAIEmbeddings(
                api_key=settings.openai_api_key,
                model="text-embedding-3-small"
            )
        return self._embeddings

    def get_collection(self):
        return self.client.get_or_create_collection(
            name="research_memory",
            metadata={"description": "Research agent memory storage"}
        )

    def _generate_id(self, prefix: str, item_id: str) -> str:
        return f"{prefix}_{item_id}"

    def save(self, session_id: str, item_id: str, text: str, metadata: dict, user_id: Optional[str] = None) -> None:
        collection = self.get_collection()
        doc_id = self._generate_id("doc", item_id)
        metadata["session_id"] = session_id
        metadata["user_id"] = user_id
        metadata["created_at"] = datetime.utcnow().isoformat()
        
        existing = collection.get(ids=[doc_id])
        if existing and existing.get("ids"):
            collection.update(ids=[doc_id], documents=[text], metadatas=[metadata])
        else:
            collection.add(ids=[doc_id], documents=[text], metadatas=[metadata])

    async def save_async(self, session_id: str, item_id: str, text: str, metadata: dict) -> None:
        await asyncio.to_thread(self.save, session_id, item_id, text, metadata)

    def recall(self, query: str, session_id: Optional[str] = None, limit: int = 5, user_id: Optional[str] = None) -> list[dict]:
        collection = self.get_collection()
        query_embedding = self.embeddings.embed_query(query)
        
        # Build filter: must include user_id for security
        where_filter = {}
        if session_id:
            where_filter["session_id"] = session_id
        if user_id:
            where_filter["user_id"] = user_id
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where_filter if where_filter else None
        )
        
        hits = []
        if results and results.get("ids") and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                hits.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if i < len(results["documents"][0]) else "",
                    "metadata": results["metadatas"][0][i] if i < len(results["metadatas"][0]) else {},
                    "distance": results["distances"][0][i] if i < len(results["distances"][0]) else 0.0
                })
        return hits

    async def recall_async(self, query: str, session_id: Optional[str] = None, limit: int = 5, user_id: Optional[str] = None) -> list[dict]:
        return await asyncio.to_thread(self.recall, query, session_id, limit, user_id)

    def get_by_session(self, session_id: str, limit: int = 50) -> list[dict]:
        collection = self.get_collection()
        results = collection.get(
            where={"session_id": session_id},
            limit=limit
        )
        
        hits = []
        if results and results.get("ids"):
            for i, doc_id in enumerate(results["ids"]):
                hits.append({
                    "id": doc_id,
                    "content": results["documents"][i] if i < len(results["documents"]) else "",
                    "metadata": results["metadatas"][i] if i < len(results["metadatas"]) else {}
                })
        return hits

    def delete_by_session(self, session_id: str) -> None:
        collection = self.get_collection()
        results = collection.get(where={"session_id": session_id})
        if results and results.get("ids"):
            collection.delete(ids=results["ids"])
