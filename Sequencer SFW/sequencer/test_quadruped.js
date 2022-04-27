let keyval = 0;	
var rotX = 0, rotY = 0, varModel = 0;
let joint = [[],[],[],[]], frames = [], triggerMENU = [], sequence = [];
let frameADD = [[],[],[],[],[],[]], frameN = [1,1,1,1,1,1], saveButton = [[],[],[],[],[],[]], sequencer = [[],[],[],[],[],[]];
let headerHeight, leftWidth, rightWidth, middleWidth;

class headerButtons{
  constructor(name,x,message){
    this.name = name;
    this.xPos = x;
    this.msg = message;
    this.clickEvent = this.clickEvent.bind(this);
    this.createButtons();
  }
  createButtons(){
    this.button = createButton(this.name);
    this.button.position(this.xPos,0.705*headerHeight);
    this.button.mousePressed(this.clickEvent);
  }
  updatePos(x) {
    this.xPos = x;
    this.button.position(x,0.705*headerHeight);
  }
  updateName(newname){
    this.button.html(newname);
  }
  clickEvent(){
    this.button.style('background-color', 'rgb(200,90,0)');
    this.button.value(1);
    delayT(500).then(() => alert("Please wait for the robot to " + this.msg));
    delayT(5000).then(() => {this.button.style('background-color', 'rgb(57, 57, 57)');
    for(let i = 0; i <= 3; i++){
      for (let j = 0; j <= 2; j++){
        joint[i][j].input.value(0);
        joint[i][j].slider.value(0);
      }
    }});
  }
}

class anglesInput{
  constructor(name,x,y,width,color){
    this.name = name;
    this.xPos = x;
    this.yPos = y;
    this.width = width/4;
    this.size = width/4.5;
    this.color = color;
    this.minVal = -80;
    this.maxVal = 80;
    this.inputEvent = this.inputEvent.bind(this);
    this.sliderEvent = this.sliderEvent.bind(this);
    this.createInputs();
  }
  createInputs() {
    this.label = createDiv(this.name);
    this.label.style('color', 'white');
    this.label.position(this.xPos,this.yPos);
    
    this.input = createInput('0');
    this.input.style('color', this.color);
    this.input.position(this.xPos,this.yPos+this.label.height+5);
    this.input.size(this.size);
    this.input.input(this.inputEvent);

    this.slider = createSlider(this.minVal, this.maxVal, 0);
    this.slider.position(this.xPos-6,this.yPos+this.label.height+this.input.height+15);
    this.slider.style('width', (this.width).toString()+'px');
    this.slider.style('background-color', this.color);
    this.slider.changed(this.sliderEvent);
  }
  updateInputs(x,y,width) {
    this.label.position(x,y);

    this.input.position(x,y+this.label.height+5);
    this.input.size(width/4.5);

    this.slider.position(x-6,y+this.label.height+this.input.height+15);
    this.slider.style('width', (width/4).toString()+'px');
  }
  inputEvent() {
    if(this.input.value()<this.minVal || this.input.value()>this.maxVal){
      alert(this.input.value() + " degrees is out of the range [-80,80]");
      this.input.value(0);
    }
    this.slider.value(this.input.value());
  }
  sliderEvent(){
    this.input.value(this.slider.value());
  }
}

class sequenceInput{
  constructor(i,j){
    this.x = i;
    this.y = j;
    this.minVal = 0;
    this.maxVal = 100;
    this.addFRAME = this.addFRAME.bind(this);
    this.delFRAME = this.delFRAME.bind(this);
    this.saveSEQ = this.saveSEQ.bind(this);
    this.frameIN = [[],[],[],[],[],[]];
    this.frameMOD = [[],[],[],[],[],[]];
    this.modifierIN = [[],[],[],[],[],[]];
    this.frameADD = [];
    this.frameDEL = [];
    this.saveButton = [];
    this.createInputs();
  }
  createInputs() {
    this.frameIN[this.x][this.y] = createInput('');
    this.frameIN[this.x][this.y].attribute('placeholder', 'FRAME');
    this.frameIN[this.x][this.y].size(50);
    this.frameIN[this.x][this.y].position(leftWidth*0.07+185,headerHeight+canvasHeight+0.15*this.x*footerHeight);

    this.frameMOD[this.x][this.y] = createSelect();
    this.frameMOD[this.x][this.y].position(leftWidth*0.07+250,headerHeight+canvasHeight+0.15*this.x*footerHeight);
    this.frameMOD[this.x][this.y].option('T');
    this.frameMOD[this.x][this.y].option('S');
    this.frameMOD[this.x][this.y].style('background-color', 'rgb(125, 125, 125)');

    this.modifierIN[this.x][this.y] = createInput('0');
    this.modifierIN[this.x][this.y].size(30);
    this.modifierIN[this.x][this.y].position(leftWidth*0.07+290,headerHeight+canvasHeight+0.15*this.x*footerHeight);

    this.frameADD[this.x] = createButton('+');
    this.frameADD[this.x].position(leftWidth*0.07+333,headerHeight+canvasHeight+0.15*this.x*footerHeight);
    this.frameADD[this.x].style('background-color', 'rgb(125, 125, 125)');
    this.frameADD[this.x].style('box-shadow', 'none');
    this.frameADD[this.x].mousePressed(this.addFRAME);

    this.frameDEL[this.x] = createButton('-');
    this.frameDEL[this.x].style('background-color', 'rgb(125, 125, 125)');
    this.frameDEL[this.x].style('box-shadow', 'none');
    this.frameDEL[this.x].style('width', '19px');
    this.frameDEL[this.x].style('height', '18px');
    this.frameDEL[this.x].mousePressed(this.delFRAME);

    this.saveButton[this.x] = createButton('SAVE');
    this.saveButton[this.x].style('background-color', 'rgb(125, 125, 125)');
    this.saveButton[this.x].mousePressed(this.saveSEQ);
  }
  addFRAME(){
    frameN[this.x]++;         //Frame counter for sequence x
    this.y = frameN[this.x];  //When user adds a frame it creates other column [x][y]

    this.frameIN[this.x][this.y] = createInput('');
    this.frameIN[this.x][this.y].attribute('placeholder', 'FRAME');
    this.frameIN[this.x][this.y].size(50);
    this.frameIN[this.x][this.y].position(leftWidth*0.07+184+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);
    
    this.frameMOD[this.x][this.y] = createSelect();
    this.frameMOD[this.x][this.y].position(leftWidth*0.07+250+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);
    this.frameMOD[this.x][this.y].option('T');
    this.frameMOD[this.x][this.y].option('S');
    this.frameMOD[this.x][this.y].style('background-color', 'rgb(125, 125, 125)');

    this.modifierIN[this.x][this.y] = createInput('0');
    this.modifierIN[this.x][this.y].size(30);
    this.modifierIN[this.x][this.y].position(leftWidth*0.07+290+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);

    this.frameADD[this.x].position(leftWidth*0.07+333+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);
    this.frameDEL[this.x].position(leftWidth*0.07+360+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);
    this.saveButton[this.x].position(leftWidth*0.07+385+150*(this.y-1),headerHeight+canvasHeight+0.15*this.x*footerHeight);
  }
  delFRAME(){
    (this.frameIN[this.x]).splice(frameN[this.x],1);
    frameN[this.x]--;
  }
  saveSEQ(){
    alert("Saved sequence " + this.x);
  }
}

function delayT(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function setup(){
  //Switch width and height if the orientation changes
  if(deviceOrientation == LANDSCAPE){
    createCanvas(windowWidth,windowHeight, WEBGL);
    wWidth = windowWidth;
    wHeight = windowHeight;
  }
  else{
    createCanvas(windowHeight,windowWidth, WEBGL);
    wWidth = windowHeight;
    wHeight = windowWidth;
  }

  //Set up the canvas
  wWidth = wWidth;
  wHeight >= 600 ? headerHeight = 0.15*wHeight : headerHeight = 70;
  wHeight >= 600 ? footerHeight = 0.25*wHeight : footerHeight = 150;
  canvasHeight = wHeight - headerHeight - footerHeight;

  //Establish min size for canvases
  if (wWidth >= 1000){
    leftWidth = 0.2*wWidth;
    middleWidth = 0.6*wWidth;
    rightWidth = 0.2*wWidth;
  }
  else{
    leftWidth = 200;
    middleWidth = wWidth - 400;
    rightWidth = 200;
  }

  //Set up the canvases
  header = createGraphics(wWidth,headerHeight);
  leftCanvas = createGraphics(leftWidth,canvasHeight);
  middleCanvas = createGraphics(middleWidth,canvasHeight);
  rightCanvas = createGraphics(rightWidth,canvasHeight);
  footer = createGraphics(wWidth,footerHeight);

  logo = loadImage('assets/logo.png');
  roboto = loadFont('assets/roboto.ttf');

  //Set up header buttons and menus
  infoButton = createButton('i');
  infoButton.value(0);
  infoButton.position(wWidth-1/4*headerHeight, 1/3.5*headerHeight);
  infoButton.size(22,22);
  infoButton.style('border-radius','50%');
  infoButton.style('box-shadow', '1px 1px 1px 1px black');
  infoButton.style('background-image', 'linear-gradient(to bottom right, black, grey)');
  infoButton.mousePressed(changeButtonI);
  //COM port menu
  COMmenu = createSelect();
  COMmenu.position(wWidth-25-int(wWidth/25), 0.7*headerHeight);
  COMmenu.option('AUTO');
  COMmenu.option('OFF');
  COMmenu.selected('OFF');
  COMlabel = createDiv('COM');
  COMlabel.style('color', 'rgb(57, 57, 57)');
  COMlabel.position(wWidth-COMmenu.width-45-int(wWidth/25), 0.705*headerHeight);
  //Baudrate menu
  BAUDmenu = createSelect();
  BAUDmenu.position(COMlabel.position().x-BAUDmenu.width-15-int(wWidth/25),0.7*headerHeight);
  BAUDmenu.option('2400');
  BAUDmenu.option('9600');
  BAUDmenu.option('38400');
  BAUDmenu.option('115200');
  BAUDmenu.selected('115200');
  BAUDlabel = createDiv('BAUD');
  BAUDlabel.style('color', 'rgb(57, 57, 57)');
  BAUDlabel.position(BAUDmenu.position().x-50, 0.705*headerHeight);
  //Emergency button
  emergencyButton = createButton('');
  emergencyButton.position(BAUDlabel.position().x-35-int(wWidth/25), 0.65*headerHeight);
  emergencyButton.size(85,85);
  emergencyButton.style('box-shadow', 'none');
  emergencyButton.style('background-color','rgb(254, 175, 60)');
  emergencyButton.style('border-radius','50%');
  emergencyButton.addClass('emergency');
  emergencyButton.mousePressed(changeButtonE);
  //Teach button
  teachButton = new headerButtons('TEACH',emergencyButton.position().x-15-int(wWidth/25),'go limp');
  //Halt & Hold button
  haltButton = new headerButtons('HALT & HOLD',teachButton.xPos-62-int(wWidth/25),'halt and hold');
  if (wWidth<1000){
    haltButton.updateName('HOLD');
    COMlabel.html('COM');
    BAUDlabel.html('BAUD');
    COMlabel.position(wWidth-COMmenu.width-40-int(wWidth/25), 0.705*headerHeight);
    BAUDlabel.position(BAUDmenu.position().x-43, 0.705*headerHeight);
    emergencyButton.position(BAUDlabel.position().x-40-int(wWidth/25), 0.65*headerHeight);
    if(wWidth<=900){
      COMlabel.html('');
      BAUDmenu.position(COMlabel.position().x-3-int(wWidth/25),0.7*headerHeight);
      BAUDlabel.html('');
      emergencyButton.position(BAUDmenu.position().x-50-int(wWidth/25), 0.65*headerHeight);
      teachButton.updatePos(emergencyButton.position().x-25-int(wWidth/25));
    }
    haltButton.updatePos(teachButton.xPos-16-int(wWidth/25));
  }
  //Limp button
  limpButton = new headerButtons('LIMP',haltButton.xPos-12-int(wWidth/25),'go limp');
  //Calibrate button
  caliButton = new headerButtons('CALIBRATE',limpButton.xPos-50-int(wWidth/25),'go limp');
  //Robot model menu
  MODELmenu = createSelect();
  MODELmenu.position(caliButton.xPos-55-int(wWidth/25), 0.705*headerHeight);
  MODELmenu.option('DESKPET');
  MODELmenu.option('MECHDOG');
  MODELmenu.selected('MECHDOG');
  MODELmenu.changed(updateModel);

  //Left canvas inputs
  for(let i = 0; i <= 3; i++){
    for (let j = 0; j <= 2; j++){
      switch(j){
        case 0:
          labcolor = 'rgb(200,90,0)';
          switch(i){
            case 0:
              label = 'FRONT LEFT';
              break;
            case 1:
              label = 'FRONT RIGHT';
              break;
            case 2:
              label = 'BACK LEFT';
              break;
            case 3:
              label = 'BACK RIGHT';
              break;
          }
          break;
        case 1:
          labcolor = 'Orange';
          label = '&nbsp;';
          break;
        case 2:
          labcolor = 'Black';
          label = '&nbsp;';
          break;
      }
      joint[i][j] = new anglesInput(label,leftWidth*(j*0.3+0.07), headerHeight+20+i*wHeight/10, leftWidth, labcolor);
    }
  }

  //Robot Model
  updateModel();

  //Footer inputs
  for(let i = 1; i < 6; i++){
    triggerMENU[i] = createSelect();
    triggerMENU[i].position(leftWidth*0.07,headerHeight+canvasHeight+0.15*i*footerHeight);
    triggerMENU[i].option('TRIGGER');
    triggerMENU[i].option('FACE');
    triggerMENU[i].option('BALL');
    triggerMENU[i].option('ARROW UP');
    triggerMENU[i].option('ARROW DOWN');
    triggerMENU[i].option('ARROW LEFT');
    triggerMENU[i].option('ARROW RIGHT');
    triggerMENU[i].selected('TRIGGER');
    triggerMENU[i].style('width', '80px');
    triggerMENU[i].style('background-color', 'rgb(125, 125, 125)');

    sequence[i] = createDiv('SEQUENCE ' + i);
    sequence[i].style('color', 'white');
    sequence[i].style('font-family', 'Roboto');
    sequence[i].position(leftWidth*0.07+90,headerHeight+canvasHeight+0.15*i*footerHeight);

    for(let i = 1; i < 6; i++) sequencer[i] = new sequenceInput(i,0);
  }
}

function updateModel(){
  switch(MODELmenu.selected()){
    case 'DESKPET':
      body = loadModel("assets/deskpet/body.obj");
      shoulder = loadModel("assets/deskpet/shoulder.obj");
      knee = loadModel("assets/deskpet/shoulder-knee.obj");
      leg_right = loadModel("assets/deskpet/lower-leg-right.obj");
      leg_left = loadModel("assets/deskpet/lower-leg-left.obj");
      break;
    case 'MECHDOG':
      body = loadModel("assets/mechdog/body.obj");
      shoulder = loadModel("assets/mechdog/leg-a.obj");
      knee_right = loadModel("assets/mechdog/leg-b.obj");
      knee_left = loadModel("assets/mechdog/leg-b2.obj");
      leg_right = loadModel("assets/mechdog/leg-c.obj");
      leg_left = loadModel("assets/mechdog/leg-c2.obj");
      break;
  }
}

//Energency Stop
function changeButtonE() {
  emergencyButton.style('background-color', 'rgb(200,90,0)');
  delayT(500).then(() => alert("Emergency stop activated"));
  delayT(5000).then(() => emergencyButton.style('background-color', 'rgb(254, 175, 60)'));
}

//Infobox
function changeButtonI() {
  if (infoButton.value() == 1){
    infoButton.style('background-image', 'linear-gradient(to bottom right, black, grey)');
    infoButton.value(0);
  }
  else{
    infoButton.style('background-image', 'linear-gradient(to bottom right, grey, black)');
    infoButton.value(1);
    // alert("ADD INFO HERE");
  }
}

function keyPressed() {
  if (keyCode == CONTROL) {
    keyval = 255;
  }
}

function keyReleased() {
  if (keyCode == CONTROL) {
    keyval = 0;
  }
}

function windowResized() {
  if(windowWidth >= windowHeight){
    resizeCanvas(windowWidth,windowHeight);
    wWidth = windowWidth;
    wHeight = windowHeight;
  }
  else{
    resizeCanvas(windowHeight,windowWidth);
    wWidth = windowHeight;
    wHeight = windowWidth;
  }

  wHeight >= 600 ? headerHeight = 0.15*wHeight : headerHeight = 70;
  wHeight >= 600 ? footerHeight = 0.25*wHeight : footerHeight = 150;
  canvasHeight = wHeight - headerHeight - footerHeight;

  if (wWidth >= 1000){
    leftWidth = 0.2*wWidth;
    middleWidth = 0.6*wWidth;
    rightWidth = 0.2*wWidth;
  }
  else{
    leftWidth = 200;
    middleWidth = wWidth - 400;
    rightWidth = 200;
  }

  leftCanvas = createGraphics(leftWidth,canvasHeight);
  middleCanvas = createGraphics(middleWidth,canvasHeight);
  rightCanvas = createGraphics(rightWidth,canvasHeight);
  footer = createGraphics(wWidth,footerHeight);
  infoButton.position(wWidth-1/4*headerHeight, 1/3.5*headerHeight);

  COMmenu.position(wWidth-25-int(wWidth/25), 0.7*headerHeight);
  COMlabel.position(wWidth-COMmenu.width-45-int(wWidth/25), 0.705*headerHeight);
  BAUDmenu.position(COMlabel.position().x-BAUDmenu.width-15-int(wWidth/25),0.7*headerHeight);
  BAUDlabel.position(BAUDmenu.position().x-50, 0.705*headerHeight);
  emergencyButton.position(BAUDlabel.position().x-40-int(wWidth/25), 0.65*headerHeight);
  teachButton.updatePos(emergencyButton.position().x-15-int(wWidth/25));
  if (wWidth>= 1000){
    haltButton.updateName('HALT & HOLD');
    COMlabel.html('COM');
    BAUDlabel.html('BAUD');
    haltButton.updatePos(teachButton.xPos-62-int(wWidth/25));
  }
  if (wWidth<1000){
    haltButton.updateName('HOLD');
    COMlabel.html('COM');
    BAUDlabel.html('BAUD');
    COMlabel.position(wWidth-COMmenu.width-40-int(wWidth/25), 0.705*headerHeight);
    BAUDlabel.position(BAUDmenu.position().x-43, 0.705*headerHeight);
    emergencyButton.position(BAUDlabel.position().x-40-int(wWidth/25), 0.65*headerHeight);
    if(wWidth<=900){
      COMlabel.html('');
      BAUDmenu.position(COMlabel.position().x-3-int(wWidth/25),0.7*headerHeight);
      BAUDlabel.html('');
      emergencyButton.position(BAUDmenu.position().x-50-int(wWidth/25), 0.65*headerHeight);
      teachButton.updatePos(emergencyButton.position().x-25-int(wWidth/25));
    }
    haltButton.updatePos(teachButton.xPos-16-int(wWidth/25));
  }
  limpButton.updatePos(haltButton.xPos-12-int(wWidth/25));
  caliButton.updatePos(limpButton.xPos-50-int(wWidth/25));
  MODELmenu.position(caliButton.xPos-55-int(wWidth/25), 0.705*headerHeight);

  //Left canvas inputs
  for(let i = 0; i <= 3; i++){
    for (let j = 0; j <= 2; j++){
      joint[i][j].updateInputs(leftWidth*(j*0.3+0.07),headerHeight+20+i*wHeight/10,leftWidth);
    }
  }

  // //Footer inputs
  // for(let i = 1; i < 6; i++){
  //   triggerMENU[i].position(leftWidth*0.07,headerHeight+canvasHeight+0.15*i*footerHeight);
  //   sequence[i].position(leftWidth*0.07+90,headerHeight+canvasHeight+0.15*i*footerHeight);
  //   for(let j = 0; j <= frameN; j++){
  //     frameIN[i][j].position(leftWidth*0.07+190+110*j,headerHeight+canvasHeight+0.15*i*footerHeight);
  //     frameMOD[i][j].position(leftWidth*0.07+260+110*j,headerHeight+canvasHeight+0.15*i*footerHeight);
  //   }
  // }
}

function mouseDragged(){
  if (keyval == 255){
    rotY -= (mouseX - pmouseX) * 0.01;
    rotX -= (mouseY - pmouseY) * 0.01;
  }
  if (mouseButton === RIGHT){
    rotY -= (mouseX - pmouseX) * 0.01;
    rotX -= (mouseY - pmouseY) * 0.01;
  }
}

function draw(){
  drawMiddleCanvas();
  image(middleCanvas, -1/2*wWidth+leftWidth, -1/2*wHeight+headerHeight);
  drawLeftCanvas();
  drawRightCanvas();
  drawHeader();
  image(header, -1/2*wWidth, -1/2*wHeight);
  drawFooter();
}

function drawHeader(){
  noStroke();
  fill(57);
  rect(-1/2*wWidth, -1/2*wHeight, wWidth, headerHeight*0.65);
  fill(254,175,60);
  rect(-1/2*wWidth, -1/2*wHeight+headerHeight*0.65, wWidth, headerHeight*0.35);
  image(logo, -1/2*wWidth, -1/2*wHeight+0.1*headerHeight, 2.4*headerHeight, headerHeight);
  textFont(roboto);
  textSize(0.3*headerHeight);
  fill(255, 255, 255);
  text('LSS-SEQUENCER', 1/2*wWidth-2.7*headerHeight,-1/2*wHeight+0.5*headerHeight);
}

function drawFooter(){
  footer.background(57);
  image(footer, -1/2*wWidth, 1/2*wHeight-footerHeight);
}

function drawLeftCanvas() {
  leftCanvas.background(125);
  image(leftCanvas, -1/2*wWidth, -1/2*wHeight+headerHeight);
}

function drawMiddleCanvas(){
  push();
  //  writePos();
  background(150);
  smooth();
  lights();
  directionalLight(51, 102, 126, -1, 0, 0);

  noStroke();

  rotateX(-rotX);
  rotateY(-rotY);

  if(MODELmenu.selected() == 'DESKPET'){
    scale(-(canvasHeight+middleWidth)/(2*16));
    translate(0, canvasHeight/250, 0);
  }
  else{
    scale((canvasHeight+middleWidth)/(2*650));
    translate(0, -canvasHeight/6, 0);
  }
  fill(235);

  //BODY
  rotateY(radians(-25));
  model(body);

  if(MODELmenu.selected() == 'DESKPET'){
    
    body_offw = 0.4;
    body_width = 2.33;
    body_length = 5.5;
    shoulder_offw = 0.85;
    shoulder_offh = 0.3;
    shoulder_body_offw = 0.92;
    knee_offw = 0.25;
    knee_body_offw = 1.7;
    knee_body_offl = 2.82;

    rotateY(radians(-90));
    translate(-body_offw, 0, body_length/2);

    //FRONT RIGHT
    push();

    //ABDUCTION
    translate(shoulder_offw, -shoulder_offh, -knee_body_offl);

    rotateZ(radians(-90 + joint[1][0].slider.value()));

    translate(0, shoulder_body_offw, 0);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(0, knee_offw);

    rotateY(radians(220 + joint[1][1].slider.value()));
    rotateZ(radians(-90));

    translate(knee_body_offw, -0.22, 3.5);

    fill(254,175,60);
    model(knee);

    //KNEE
    translate(-knee_body_offw, -0.6, -5.25);

    rotateX(radians(-15 + joint[1][2].slider.value()));
    rotateY(radians(-90));

    translate(0.45, 1.17, -knee_offw);
    fill(125);
    model(leg_right);

    pop();

    //FRONT LEFT
    push();
    
    //ABDUCTION
    translate(-shoulder_offw, -shoulder_offh, -knee_body_offl);

    rotateZ(radians(90 - joint[0][0].slider.value()));

    translate(0, shoulder_body_offw, 0);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(0, knee_offw);

    rotateY(radians(45));
    rotateY(radians(220 - joint[0][1].slider.value()));
    rotateZ(radians(-90));

    translate(knee_body_offw, 0.6, 5.25);

    fill(254,175,60);
    model(knee);

    //KNEE
    translate(-knee_body_offw, 0.22, -3.5);

    rotateX(radians(-55 - joint[0][2].slider.value()));
    rotateY(radians(-90));

    translate(knee_body_offw, 0.9, -0.8);
    fill(125);
    model(leg_left);

    pop();

    //BACK RIGHT
    push();

    //ABDUCTION
    translate(shoulder_offw, -shoulder_offh, knee_body_offl);

    rotateX(radians(180));
    rotateZ(radians(-90 - joint[2][0].slider.value()));

    translate(0, shoulder_body_offw, 0);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(0, knee_offw);

    rotateY(radians(180));
    rotateY(radians(220 + joint[2][1].slider.value()));
    rotateZ(radians(-90));

    translate(knee_body_offw, -0.22, 3.5);

    fill(254,175,60);
    model(knee);

    //KNEE
    translate(-knee_body_offw, -0.6, -5.25);

    rotateX(radians(-15 + joint[2][2].slider.value()));
    rotateY(radians(-90));

    translate(0.45, 1.17, -knee_offw);
    fill(125);
    model(leg_right);

    pop();

    //BACK LEFT
    push();

    //ABDUCTION
    translate(-shoulder_offw, -shoulder_offh, knee_body_offl);

    rotateX(radians(180));
    rotateZ(radians(90 + joint[3][0].slider.value()));

    translate(0, shoulder_body_offw, 0);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(0, knee_offw);

    rotateY(radians(180+45));
    rotateY(radians(220 - joint[3][1].slider.value()));
    rotateZ(radians(-90));

    translate(knee_body_offw, 0.6, 5.25);

    fill(254,175,60);
    model(knee);

    //KNEE
    translate(-knee_body_offw, 0.22, -3.5);

    rotateX(radians(-55 - joint[3][2].slider.value()));
    rotateY(radians(-90));

    translate(knee_body_offw, 0.9, -0.8);
    fill(125);
    model(leg_left);

    pop();
    pop();
  }

  if(MODELmenu.selected() == 'MECHDOG'){

    //FRONT LEFT
    push();
  
    //ABDUCTION
    translate(38, 27, 102);

    rotateZ(radians(-joint[0][0].slider.value()));

    translate(-38, -27, -110);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(90, 27, 135);
    
    rotateX(radians(-joint[0][1].slider.value()));
    rotateZ(radians(-180));
    
    translate(-90, -27, -135);

    fill(254,175,60);
    model(knee_left);
    
    //KNEE
    translate(90,-53,90);

    rotateX(radians(joint[0][2].slider.value()));

    translate(-90,53,-90);
    fill(125);
    model(leg_left);

    pop();

    //FRONT RIGHT
    push();
    
    //ABDUCTION
    translate(-38, 27, 102);

    rotateZ(radians(180 + joint[1][0].slider.value()));

    translate(-38, -27, -110);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(0, 27, 135);

    rotateX(radians(joint[1][1].slider.value()));
    
    translate(0, -27, -135);

    fill(254,175,60);
    model(knee_right);

    //KNEE
    translate(90,-53,90);

    rotateX(radians(joint[1][2].slider.value()));

    translate(-90,53,-90);
    fill(125);
    model(leg_right);
    
    pop();

    //BACK LEFT
    push();

    //ABDUCTION
    translate(38, 27, -98);

    rotateZ(radians(-joint[2][0].slider.value()));

    translate(-38, -27, -110);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(90, 27, 135);

    rotateZ(radians(-180));
    rotateX(radians(joint[2][1].slider.value()));
    
    translate(-90, -27, -135);

    fill(254,175,60);
    model(knee_left);

    //KNEE
    translate(90,-53,90);

    rotateX(radians(joint[2][2].slider.value()));

    translate(-90,53,-90);

    fill(125);
    model(leg_left);

    pop();

    //BACK RIGHT
    push();

    //ABDUCTION
    translate(-38, 27, -98);

    rotateZ(radians(180 + joint[3][0].slider.value()));

    translate(-38, -27, -110);

    fill(200,90,0);
    model(shoulder);

    //ROTATION
    translate(90, 27, 135);

    rotateX(radians(joint[3][1].slider.value()));
    
    translate(-90, -27, -135);

    fill(254,175,60);
    model(knee_right);

    //KNEE
    translate(90,-53,90);

    rotateX(radians(joint[3][2].slider.value()));

    translate(-90,53,-90);

    fill(125);
    model(leg_right);

    pop();
    pop();
  }
}

function drawRightCanvas() {
  rightCanvas.background(125);
  image(rightCanvas, -1/2*wWidth+leftWidth+middleWidth, -1/2*wHeight+headerHeight);
}

// let millisOld = 0, gTime = 0, gSpeed = 4;

// function setTime(){
//   gTime += Date.now()/1000 - millisOld*(gSpeed/4);
//   if(gTime >= 4)  gTime = 0;
//   millisOld = Date.now()/1000;
// }

// let posX = 1, posY = 50, posZ = 50;

// function writePos(){
//   IK();
//   setTime();
//   posX = Math.sin(gTime*Math.PI/2)*20;
//   posZ = Math.sin(gTime*Math.PI)*10;
// }

// function IK(){
//   var F = 50;
//   var T = 70;

//   var X = posX;
//   var Y = posY;
//   var Z = posZ;

//   var L = sqrt(Y*Y+X*X);
//   var dia = sqrt(Z*Z+L*L);

//   alfa = PI/2-(atan2(L, Z)+acos((T*T-F*F-dia*dia)/(-2*F*dia)));
//   beta = -PI+acos((dia*dia-T*T-F*F)/(-2*F*T));
//   gamma = atan2(Y, X);
// }

// //PINK PIVOT
// fill(255,0,255);
// circle(0, 0, 1);

// fill(0, 102, 153); // TEAL