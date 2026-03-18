from dotenv import load_dotenv
load_dotenv()

from langchain_huggingface import HuggingFaceEndpoint

llm = HuggingFaceEndpoint(
    repo_id="mistralai/Mistral-7B-Instruct-v0.2",
    task="text-generation"
)

response = llm.invoke("Explain artificial intelligence simply.")

print(response)