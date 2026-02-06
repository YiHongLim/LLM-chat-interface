from typing import List
from dotenv import load_dotenv
from deepeval.dataset import EvaluationDataset, ConversationalGolden
from deepeval.test_case import Turn
from deepeval.conversation_simulator import ConversationSimulator

load_dotenv()

golden = ConversationalGolden(
    scenario="Andy Byron wants to purchase a VIP ticket to a Coldplay concert.",
    expected_outcome="Successful purchase of a ticket.",
    user_description="Andy Byron is the CEO of Astronomer.",
)

dataset = EvaluationDataset(goldens=[golden])

dataset.push(alias="A new multi-turn dataset")

async def your_chatbot(input: str, turns: List[Turn], thread_id: str):
    return "Mock response"

async def model_callback(input: str, turns: List[Turn], thread_id: str) -> Turn:
    # Replace with your chatbot
    response = await your_chatbot(input, turns, thread_id)
    return Turn(role="assistant", content=response)

simulator = ConversationSimulator(model_callback=model_callback)
conversational_test_cases = simulator.simulate(goldens=dataset.goldens, max_turns=10)