from config import Config
from adapters.claim_adapter import ClaimAdapter

claim_adapter = ClaimAdapter(Config.URL, Config.HEADERS)

def request_claim(wallet_address):
    payload = {
        "prompt": {"role": "user", "content": Config.PROMPTS["claim_request"]},
        "wallet_address": wallet_address
    }
    return claim_adapter.ask_agent(payload)

def provide_receiver_address(wallet_address, receiver_address):
    payload = {
        "prompt": {"role": "user", "content": receiver_address},
        "wallet_address": wallet_address
    }
    return claim_adapter.ask_agent(payload)

def confirm_transaction(wallet_address):
    payload = {
        "prompt": {"role": "user", "content": Config.PROMPTS["proceed"]},
        "wallet_address": wallet_address
    }
    return claim_adapter.ask_agent(payload)
