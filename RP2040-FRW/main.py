from src.api import API
from src.constants import LEDColor

############## PUT YOUR CODE HERE 

deskpet = API()

def main():
    deskpet.dimLeds(color=LEDColor.GREEN, times = 5)
    
    while(True):
        ############## PUT YOUR CODE HERE
        break


if __name__ == "__main__":
    main()
