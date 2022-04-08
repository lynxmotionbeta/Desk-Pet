from machine import Pin, Timer, UART
from movement import *

import time

uart0 = UART(0,115200)
uart1 = UART(1, baudrate=9600, tx=Pin(8), rx=Pin(9))
led = Pin(25, Pin.OUT,value=1)
button = Pin(4, Pin.IN, Pin.PULL_UP)
tim = Timer()
counter = 1
BASE_TIME = 50 #ms
BASE_FREC = 1000/BASE_TIME

# Servo definitions
leg1Elbow =  Servo(15,uart0,offset = -5, invert = True)
leg1Rotation =  Servo(14,uart0,offset = 49)
leg1abduction =  Servo(13,uart0,offset = 118,invert = True)

leg2Elbow =  Servo(0,uart0,offset = 7)
leg2Rotation =  Servo(1,uart0,offset = 31, invert = True)
leg2abduction =  Servo(2,uart0,offset = 66)

leg3Elbow =  Servo(31,uart0,offset = 1,invert = True)
leg3Rotation =  Servo(30,uart0,offset = 53)
leg3abduction =  Servo(29,uart0,offset = 60)

leg4Elbow =  Servo(16,uart0,offset = 9)
leg4Rotation =  Servo(17,uart0,offset = 30, invert = True)
leg4abduction =  Servo(18,uart0,offset = 100,invert = True)

#Leg definition
leg1 =  Leg(1,leg1Elbow,leg1Rotation,leg1abduction) 
leg2 =  Leg(2,leg2Elbow,leg2Rotation,leg2abduction) 
leg3 =  Leg(3,leg3Elbow,leg3Rotation,leg3abduction) 
leg4 =  Leg(4,leg4Elbow,leg4Rotation,leg4abduction)

#Body definition
deskpet = Body([leg3,leg1,leg2,leg4])


def sendCommand(timer):
    global led
    global counter
    global deskpet
    
    led.toggle()
    speed =  18
    
    if counter >= (21-speed):
        deskpet.move()
        deskpet.updateBodyPos(counter*BASE_TIME)
        counter = 0
        #print("move")
        
    #print("moveOUT")    
    counter = counter + 1   


def main ():
    rxData = bytes()
    global legfr
    start_time = time.ticks_ms()
    #deskpet.setBodyPos(cgx = 0, cgy = 90, cgz = 0, roll = 0, pitch = 0, yaw = 0) # take 3ms
    tim.init(freq=BASE_FREC, mode=Timer.PERIODIC, callback= sendCommand)
    #deskpet.forward(counter*BASE_TIME)
    #leg1.inversekinematic(0,100,-30) #5ms
    #leg1.getCommandIK(0,100,-30) # 8ms
    #leg1.getCommand(10,20,30) # 8ms
    #leg1Elbow.getCommand(50) # 3ms
    #leg1Elbow.angleToPulse(50) # 0ms
    #"#"+str(leg1Elbow.ID)+"P"+str(leg1Elbow.angleToPulse(50))+"T"+ str(50)+"\r" # 4ms
    #str(1000) #1ms
    #deskpet.updateBodyPos(time = 1000)
    #str(1000)

    end_time = time.ticks_ms()
    print('Duration pos:'+str(end_time - start_time)+" milliseconds")


    #start_time = time.ticks_ms()
    #deskpet.forward(counter*BASE_TIME)
    #end_time = time.ticks_ms()
    #print('Duration gait:'+str(end_time - start_time)+" milliseconds")
    #leg1.setPosIK(0,100,-30,time = 2000)
    #leg2.setPosIK(0,100,-30,time = 2000)
    #leg3.setPosIK(0,100,-30,time = 2000)
    #leg4.setPosIK(0,100,-30,time = 2000)

    #leg1.setPos(90+16,0,0,time = 1000)
    #leg2.setPos(90+16,0,0,time = 1000)
    #leg3.setPos(90+16,0,0,time = 1000)
    #leg4.setPos(90+16,0,0,time = 1000)


if __name__ == "__main__":
    main()






