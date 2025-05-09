import os
import importlib.util

from typing import List, Dict, Any, Optional

from fastapi import APIRouter
from langchain_together import ChatTogether
from langchain_cerebras import ChatCerebras
from langchain_ollama import ChatOllama, OllamaEmbeddings

from services.vectorstore.together_embeddings import TogetherEmbeddings
from services.vectorstore.vector_store_service import VectorStoreService
from services.secrets import get_secret
from logs import setup_logging

logger = setup_logging()


def load_agent_routes() -> List[APIRouter]:
    """
    Dynamically load all route modules from agent subdirectories.
    Returns a list of FastAPI router objects.
    """
    routers: List[APIRouter] = []
    agents_dir = os.path.join(os.path.dirname(__file__), "services/agents")
    logger.info(f"Loading agents from {agents_dir}")

    for agent_dir in os.listdir(agents_dir):
        agent_path = os.path.join(agents_dir, agent_dir)
        routes_file = os.path.join(agent_path, "routes.py")

        # Skip non-agent directories
        if not os.path.isdir(agent_path) or agent_dir.startswith("__"):
            continue

        # Skip if no routes file exists
        if not os.path.exists(routes_file):
            continue

        try:
            module_name = f"services.agents.{agent_dir}.routes"
            spec = importlib.util.spec_from_file_location(module_name, routes_file)

            if spec is None or spec.loader is None:
                logger.error(f"Failed to load module spec for {routes_file}")
                continue

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if hasattr(module, "router"):
                routers.append(module.router)
                logger.info(f"Successfully loaded routes from {agent_dir}")
            else:
                logger.warning(f"No router found in {agent_dir}/routes.py")

        except Exception as e:
            logger.error(f"Error loading routes from {agent_dir}: {str(e)}")

    return routers


def load_agent_config(agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Load configuration for a specific agent by name.

    Args:
        agent_name (str): Name of the agent to load config for

    Returns:
        Optional[Dict[str, Any]]: Agent configuration if found and loaded successfully, None otherwise
    """
    agents_dir = os.path.join(os.path.dirname(__file__), "services/agents")
    agent_path = os.path.join(agents_dir, agent_name)
    config_file = os.path.join(agent_path, "config.py")

    # Verify agent directory exists and is valid
    if not os.path.isdir(agent_path) or agent_name.startswith("__"):
        logger.error(f"Invalid agent directory: {agent_name}")
        return None

    # Check config file exists
    if not os.path.exists(config_file):
        logger.warning(f"No config file found for agent: {agent_name}")
        return None

    try:
        # Import the config module
        module_name = f"services.agents.{agent_name}.config"
        spec = importlib.util.spec_from_file_location(module_name, config_file)

        if spec is None or spec.loader is None:
            logger.error(f"Failed to load module spec for {config_file}")
            return None

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Check for Config class and agent_config
        if (
            hasattr(module, "Config")
            and hasattr(module.Config, "agent_config")
            and module.Config.agent_config.is_enabled
        ):
            config_dict: Dict[str, Any] = module.Config.agent_config.model_dump()
            config_dict["name"] = agent_name
            logger.info(f"Successfully loaded config for {agent_name}")
            return config_dict
        else:
            logger.warning(f"No Config class or agent_config found in {agent_name}/config.py")
            return None

    except Exception as e:
        logger.error(f"Error loading config for {agent_name}: {str(e)}")
        return None


def load_agent_configs() -> List[Dict[str, Any]]:
    """
    Dynamically load configurations from all agent subdirectories.
    Returns a consolidated configuration dictionary.
    Skips special directories like __init__.py, __pycache__, and README.md.
    """
    agents_dir = os.path.join(os.path.dirname(__file__), "services/agents")
    logger.info(f"Loading agents from {agents_dir}")
    configs: List[Dict[str, Any]] = []

    for agent_dir in os.listdir(agents_dir):
        # Skip special directories and files
        if agent_dir.startswith("__") or agent_dir.startswith(".") or "." in agent_dir:
            continue

        config = load_agent_config(agent_dir)
        if config:
            configs.append(config)

    return configs


# Configuration object
class AppConfig:

    # Model configuration
    OLLAMA_MODEL = "llama3.2:3b"
    OLLAMA_EMBEDDING_MODEL = "nomic-embed-text"
    OLLAMA_URL = "http://host.docker.internal:11434"
    MAX_UPLOAD_LENGTH = 16 * 1024 * 1024

    # LLM Configurations
    LLM_AGENT_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo"  # Together AI
    LLM_DELEGATOR_MODEL = "llama-3.3-70b"  # Cerebras


# Get environment
env = os.environ.get("ENV", "dev")

if env == "dev":
    LLM_AGENT = ChatOllama(
        model=AppConfig.OLLAMA_MODEL,
        base_url=AppConfig.OLLAMA_URL,
        temperature=0.7,
    )

    LLM_DELEGATOR = ChatOllama(
        model=AppConfig.OLLAMA_MODEL,
        base_url=AppConfig.OLLAMA_URL,
    )

    embeddings = OllamaEmbeddings(
        model=AppConfig.OLLAMA_EMBEDDING_MODEL,
        base_url=AppConfig.OLLAMA_URL,
    )
else:
    LLM_AGENT = ChatTogether(
        api_key=get_secret("TogetherApiKey"),
        model=AppConfig.LLM_AGENT_MODEL,
        temperature=0.7,
    )

    LLM_DELEGATOR = ChatCerebras(
        api_key=get_secret("CerebrasApiKey"),
        model=AppConfig.LLM_DELEGATOR_MODEL,
    )

    embeddings = TogetherEmbeddings(
        model_name="togethercomputer/m2-bert-80M-8k-retrieval",
        api_key=get_secret("TogetherApiKey"),
    )

# Vector store path for persistence
VECTOR_STORE_PATH = os.path.join(os.getcwd(), "data", "vector_store")

# Initialize vector store service and load existing store if it exists
RAG_VECTOR_STORE = VectorStoreService(embeddings)
if os.path.exists(VECTOR_STORE_PATH):
    logger.info(f"Loading existing vector store from {VECTOR_STORE_PATH}")
    try:
        RAG_VECTOR_STORE = VectorStoreService.load(VECTOR_STORE_PATH, embeddings)
    except Exception as e:
        logger.error(f"Failed to load vector store: {str(e)}")
        # Continue with empty vector store if load fails
        RAG_VECTOR_STORE = VectorStoreService(embeddings)
