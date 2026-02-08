from db import Base, engine
from models import Event
import sqlalchemy
from colorama import Fore,init,Style

init(autoreset=True)
print("Creating Table....")


try:
    Base.metadata.create_all(bind=engine)
    print(f"{Fore.GREEN}Table Created :) ")

except sqlalchemy.exc.OperationalError as e:
    print(f"{Fore.RED}Connection Error: Docker Container Not running")
    print(f"Details:{e}")
except Exception as e:
    print(f"{Fore.RED}An unexpected error occurred")
    print(f"Details:{e}")