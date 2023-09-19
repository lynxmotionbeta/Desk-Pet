import time

class DTime:
    def __init__(self, dt = None):
        if dt <= 0:
            raise ("dt should be greater than 0ms")
        self.new = time.ticks_ms()
        self.old = time.ticks_ms()
        self.dt = dt
        self.debug = False

    def reset(self):
        self.old = time.ticks_ms()

    
    def updateDT(self,dt = None):
        if dt <= 0:
            raise ("dt should be greater than 0ms")
        self.dt = dt
        
    def getDT(self,debug = False):
        self.new = time.ticks_ms()
        dt = time.ticks_diff(self.new, self.old)
        if (debug):
            #print("Time elapsed: ")
            print(dt)
        if dt-self.dt >= 0:
            self.old = self.new
            return True
        return False
