from models.service.agent_config import AgentConfig


class Config:
    """Configuration for MOR Rewards Agent."""

    # *************
    # AGENT CONFIG
    # *************

    agent_config = AgentConfig(
        path="services.agents.mor_rewards.agent",
        class_name="MorRewardsAgent",
        description="Handles MOR token rewards distribution and claiming",
        delegator_description="Specializes in calculating, forecasting, and explaining MOR token reward mechanisms, "
        "distribution schedules, and yield optimization strategies. Use when users want to understand "
        "potential rewards, APY calculations, or reward-related projections. DO NOT use for actual "
        "token claiming processes.",
        human_readable_name="MOR Rewards Manager",
        command="morrewards",
        upload_required=False,
    )

    # *************
    # TOOLS CONFIG
    # *************

    tools = [
        {
            "name": "get_rewards",
            "description": "Get claimable MOR rewards for a user",
            "parameters": {
                "type": "object",
                "properties": {
                    "pool_id": {"type": "string", "description": "Pool ID to check rewards for"},
                    "user": {"type": "string", "description": "User address to check rewards for"},
                },
                "required": ["pool_id", "user"],
            },
        }
    ]

    # *************
    # CONTRACT CONFIG
    # *************

    WEB3RPCURL = {
        "1": "https://eth.llamarpc.com/",
    }

    DISTRIBUTION_PROXY_ADDRESS = "0x47176B2Af9885dC6C4575d4eFd63895f7Aaa4790"
    DISTRIBUTION_ABI = [
        {
            "inputs": [
                {"internalType": "uint256", "name": "poolId_", "type": "uint256"},
                {"internalType": "address", "name": "user_", "type": "address"},
            ],
            "name": "getCurrentUserReward",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
