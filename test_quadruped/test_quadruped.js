let keyval = 0, buttonCval = 0, buttonLval = 0, buttonHval = 0, buttonTval = 0, buttonEval = 0,buttonIval = 0;	
var rotX = 0, rotY = 0;
const joint = [[],[],[],[]];
let headerHeight, leftWidth, rightWidth, middleWidth;

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
    this.label.style('font-size', '18px');
    this.label.style('color', this.color);
    this.label.position(this.xPos+this.size/2,this.yPos);

    this.input = createInput('0');
    this.input.position(this.xPos,this.yPos+30);
    this.input.size(this.size);
    this.input.input(this.inputEvent);

    this.slider = createSlider(this.minVal, this.maxVal, 0);
    this.slider.position(this.xPos-6,this.yPos+60);
    this.slider.style('width', (this.width).toString()+'px');
    this.slider.changed(this.sliderEvent);
  }
  updateInputs(x,y,width) {
    this.label.position(x+width/9,y);

    this.input.position(x,y+30);
    this.input.size(width/4.5);

    this.slider.position(x-6,y+60);
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
    console.log("HELLO");
  }

  //Set up the canvas
  wWidth = wWidth;
  wHeight >= 600 ? headerHeight = 0.15*wHeight : headerHeight = 70;
  wHeight >= 600 ? footerHeight = 0.25*wHeight : footerHeight = 70;
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

  roboto = loadFont('assets/roboto.ttf');

  //Set up header buttons and menus
  infoButton = createButton('i');
  infoButton.position(wWidth-1/4*headerHeight, 1/3.5*headerHeight);
  infoButton.size(25,25);
  infoButton.style('border-radius','50%');
  infoButton.style('box-shadow', '1px 1px 1px 1px black');
  infoButton.mousePressed(changeButtonI);
  //Robot model menu
  MODELmenu = createSelect();
  MODELmenu.style('background-color', 'rgb(57, 57, 57)');
  MODELmenu.style('color', 'white');
  MODELmenu.style('font-family', 'Roboto');
  MODELmenu.style('border-color', 'rgb(57, 57, 57)');
  MODELmenu.position(wWidth-840, 0.7*headerHeight);
  MODELmenu.option('DESKPET');
  MODELmenu.option('MECHDOG');
  //Calibrate button
  caliButton = createButton('CALIBRATE');
  caliButton.position(wWidth-720, 0.705*headerHeight);
  caliButton.style('background-color','rgb(57, 57, 57)');
  caliButton.style('color', 'white');
  caliButton.style('font-family', 'Roboto');
  caliButton.style('border-width', '0');
  caliButton.style('box-shadow', '1.5px 1.5px rgb(0, 0, 0, 0.5)');
  caliButton.mousePressed(changeButtonC);
  //Limp button
  limpButton = createButton('LIMP');
  limpButton.position(wWidth-610, 0.705*headerHeight);
  limpButton.style('background-color','rgb(57, 57, 57)');
  limpButton.style('color', 'white');
  limpButton.style('font-family', 'Roboto');
  limpButton.style('border-width', '0');
  limpButton.style('box-shadow', '1.5px 1.5px rgb(0, 0, 0, 0.5)');
  limpButton.mousePressed(changeButtonL);
  //Halt button
  haltButton = createButton('HALT & HOLD');
  haltButton.position(wWidth-540, 0.705*headerHeight);
  haltButton.style('background-color','rgb(57, 57, 57)');
  haltButton.style('color', 'white');
  haltButton.style('font-family', 'Roboto');
  haltButton.style('border-width', '0');
  haltButton.style('box-shadow', '1.5px 1.5px rgb(0, 0, 0, 0.5)');
  haltButton.mousePressed(changeButtonH);
  //Teach button
  teachButton = createButton('TEACH');
  teachButton.position(wWidth-420, 0.705*headerHeight);
  teachButton.style('background-color','rgb(57, 57, 57)');
  teachButton.style('color', 'white');
  teachButton.style('font-family', 'Roboto');
  teachButton.style('border-width', '0');
  teachButton.style('box-shadow', '1.5px 1.5px  rgb(0, 0, 0, 0.5)');
  teachButton.mousePressed(changeButtonT);
  //Emergency button
  emergencyButton = createButton('STOP');
  emergencyButton.position(wWidth-350, 0.65*headerHeight);
  emergencyButton.style('background-color','rgb(255, 0, 0)');
  emergencyButton.style('font-family', 'Roboto');
  emergencyButton.style('color', 'white');
  emergencyButton.size(80,80);
  emergencyButton.style('border-radius','50%');
  emergencyButton.style('border-width', '12px');
  emergencyButton.style('border-color', 'rgb(254, 175, 60)');
  emergencyButton.style('border-style', 'solid');
  emergencyButton.mousePressed(changeButtonE);
  //Baudrate menu
  BAUDlabel = createDiv('BAUD');
  BAUDlabel.style('font-size', '16px');
  BAUDlabel.style('font-family', 'Roboto');
  BAUDlabel.style('color', 'rgb(57, 57, 57)');
  BAUDlabel.position(wWidth-260, 0.705*headerHeight);
  BAUDmenu = createSelect();
  BAUDmenu.style('background-color', 'rgb(57, 57, 57)');
  BAUDmenu.style('color', 'white');
  BAUDmenu.style('font-family', 'Roboto');
  BAUDmenu.style('border-color', 'rgb(57, 57, 57)');
  BAUDmenu.position(wWidth-210, 0.7*headerHeight);
  BAUDmenu.option('2400');
  BAUDmenu.option('9600');
  BAUDmenu.option('38400');
  BAUDmenu.option('115200');
  BAUDmenu.selected('115200');
  //COM port menu
  COMlabel = createDiv('COM');
  COMlabel.style('font-size', '16px');
  COMlabel.style('font-family', 'Roboto');
  COMlabel.style('color', 'rgb(57, 57, 57)');
  COMlabel.position(wWidth-125, 0.705*headerHeight);
  COMmenu = createSelect();
  COMmenu.style('background-color', 'rgb(57, 57, 57)');
  COMmenu.style('color', 'white');
  COMmenu.style('font-family', 'Roboto');
  COMmenu.style('border-color', 'rgb(57, 57, 57)');
  COMmenu.position(wWidth-80, 0.7*headerHeight);
  COMmenu.option('AUTO');
  COMmenu.option('OFF');
  COMmenu.selected('OFF');

  for(let i = 0; i <= 3; i++){
    for (let j = 0; j <= 2; j++){
      if (j == 0){
        label = 'A';
        labcolor = 'rgb(0,221,0)';
      }
      if (j == 1){
        label = 'R';
        labcolor = 'Yellow';
      }
      else if(j == 2){
        label = 'K';
        labcolor = 'Cyan';
      }
      joint[i][j] = new anglesInput(label,leftWidth*(j*0.3+0.07), headerHeight+20+i*90, leftWidth, labcolor);
    }
  }
  
  logo = loadImage('assets/logo.png');
  base = loadModel("assets/Desk-Pet-Body-1b.obj");
  shoulder = loadModel("assets/shoulder.obj");
  knee = loadModel("assets/shoulder-knee.obj");
  leg_right = loadModel("assets/lower-leg-right.obj");
  leg_left = loadModel("assets/lower-leg-left.obj");
}

function changeButtonC(){
  if (buttonCval == 0){
    caliButton.style('background-color', 'rgb(200,90,0)');
    buttonCval = 1;
    alert("Please wait for the robot to go limp");
  }
  else{
    caliButton.style('background-color', 'rgb(57, 57, 57)');
    buttonCval = 0;
  }
}

function changeButtonL() {
  if (buttonLval == 0){
    limpButton.style('background-color', 'rgb(200,90,0)');
    buttonLval = 1;
    alert("Please wait for the robot to go limp");
    for(let i = 0; i <= 3; i++){
      for (let j = 0; j <= 2; j++){
        joint[i][j].input.value(0);
        joint[i][j].slider.value(0);
      }
    }
  }
  else{
    limpButton.style('background-color', 'rgb(57, 57, 57)');
    buttonLval = 0;
  }
}

function changeButtonH() {
  if (buttonHval == 0){
    haltButton.style('background-color', 'rgb(200,90,0)');
    buttonHval = 1;
    alert("Please wait for the robot to halt and hold");
  }
  else{
    haltButton.style('background-color', 'rgb(57, 57, 57)');
    buttonHval = 0;
  }
}

function changeButtonT() {
  if (buttonTval == 0){
    teachButton.style('background-color', 'rgb(200,90,0)');
    buttonTval = 1;
    alert("Please wait for the robot to go limp");
  }
  else{
    teachButton.style('background-color', 'rgb(57, 57, 57)');
    buttonTval = 0;
  }
}

function changeButtonE() {
  if (buttonEval == 0){
    emergencyButton.style('background-color', 'rgb(200,90,0)');
    buttonEval = 1;
    alert("Emergency stop activated");
  }
  else{
    emergencyButton.style('background-color', 'rgb(255, 0, 0)');
    buttonEval = 0;
  }
}

function changeButtonI() {
  if (buttonIval == 0){
    infoButton.style('background-color', 'rgb(175, 175, 175)');
    buttonIval = 1;
  }
  else{
    infoButton.style('background-color', 'rgb(239, 239, 239)');
    buttonIval = 0;
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
  wHeight >= 600 ? footerHeight = 0.25*wHeight : footerHeight = 70;
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
  MODELmenu.position(wWidth-840, 0.7*headerHeight);
  caliButton.position(wWidth-720, 0.705*headerHeight);
  limpButton.position(wWidth-610, 0.705*headerHeight);
  haltButton.position(wWidth-540, 0.705*headerHeight);
  teachButton.position(wWidth-420, 0.705*headerHeight);
  emergencyButton.position(wWidth-345, 0.65*headerHeight);
  BAUDlabel.position(wWidth-260, 0.705*headerHeight);
  BAUDmenu.position(wWidth-200, 0.7*headerHeight);
  COMlabel.position(wWidth-120, 0.705*headerHeight);
  COMmenu.position(wWidth-70, 0.7*headerHeight);

  for(let i = 0; i <= 3; i++){
    for (let j = 0; j <= 2; j++){
      joint[i][j].updateInputs(leftWidth*(j*0.3+0.07),headerHeight+20+i*90,leftWidth);
    }
  }
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

function draw() {
  drawMiddleCanvas();
  image(middleCanvas, -1/2*wWidth+leftWidth, -1/2*wHeight+headerHeight);
  drawLeftCanvas();
  drawRightCanvas();
  drawHeader();
  image(header, -1/2*wWidth, -1/2*wHeight);
  drawFooter();
}

function drawHeader() {
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
  // rotateX(radians(-30));
  // rotateY(radians(30));
  
  robotScale = (canvasHeight+middleWidth)/300;
  scale(-10*robotScale);

  body_offw = 0.4;
  body_width = 2.33;
  body_length = 5.5;
  shoulder_offw = 0.85;
  shoulder_offl = 0.82;
  shoulder_offh = 0.3;
  shoulder_body_offw = 0.92;
  knee_offw = 0.25;
  knee_body_offw = 1.7;
  knee_body_offl = 2;

  translate(0, canvasHeight/250, 0);

  //BODY
  model(base);
  rotateY(radians(-90));
  
  translate(-body_offw, 0, body_length/2);
  
  //FRONT RIGHT
  push();

  //ABDUCTION
  //PIVOT WORLD
  translate(shoulder_offw, -shoulder_offh, -(knee_body_offl+shoulder_offl));

  rotateZ(radians(-90 + joint[1][0].slider.value()));//ANGLE

  //PIVOT ITSELF
  translate(0, shoulder_body_offw, 0);

  fill(0,255,0);
  model(shoulder);

  //ROTATION
  //PIVOT WORLD
  translate(0, knee_offw, shoulder_offl);

  rotateY(radians(220 + joint[1][1].slider.value()));//ANGLE
  rotateZ(radians(-90));

  //PIVOT ITSELF
  translate(knee_body_offw, -0.22, 3.5);

  fill(255,255,0);
  model(knee);

  //KNEE
  //PIVOT WORLD
  translate(-knee_body_offw, -0.6, -5.25);

  rotateX(radians(-15 + joint[1][2].slider.value()));//ANGLE
  rotateY(radians(-90));

  //PIVOT ITSELF
  translate(0.45, 1.17, -knee_offw);
  fill(0,255,255);
  model(leg_right);

  pop();

  //FRONT LEFT
  push();
  //ABDUCTION
  //PIVOT WORLD
  translate(-shoulder_offw, -shoulder_offh, -(knee_body_offl+shoulder_offl));

  rotateZ(radians(90 - joint[0][0].slider.value()));//ANGLE

  //PIVOT ITSELF
  translate(0, shoulder_body_offw, 0);

  fill(0,255,0);
  model(shoulder);

  //ROTATION
  //PIVOT WORLD
  translate(0, knee_offw, shoulder_offl);

  rotateY(radians(45));
  rotateY(radians(220 - joint[0][1].slider.value()));//ANGLE
  rotateZ(radians(-90));

  //PIVOT ITSELF
  translate(knee_body_offw, 0.6, 5.25);

  fill(255,255,0);
  model(knee);

  //KNEE
  //PIVOT WORLD
  translate(-knee_body_offw, 0.22, -3.5);

  rotateX(radians(-55 - joint[0][2].slider.value()));//ANGLE
  rotateY(radians(-90));

  translate(knee_body_offw, 0.9, -0.8);
  fill(0,255,255);
  model(leg_left);

  pop();

  //BACK RIGHT
  push();

  //ABDUCTION
  //PIVOT WORLD
  translate(shoulder_offw, -shoulder_offh, knee_body_offl+shoulder_offl);

  rotateX(radians(180));
  rotateZ(radians(-90 - joint[2][0].slider.value()));//ANGLE

  //PIVOT ITSELF
  translate(0, shoulder_body_offw, 0);

  fill(0,255,0);
  model(shoulder);

  //ROTATION
  //PIVOT WORLD
  translate(0, knee_offw, shoulder_offl);

  rotateY(radians(180));
  rotateY(radians(220 + joint[2][1].slider.value()));//ANGLE
  rotateZ(radians(-90));

  translate(knee_body_offw, -0.22, 3.5);

  fill(255,255,0);
  model(knee);

  //KNEE
  //PIVOT WORLD
  translate(-knee_body_offw, -0.6, -5.25);

  rotateX(radians(-15 + joint[2][2].slider.value()));//ANGLE
  rotateY(radians(-90));

  //PIVOT ITSELF
  translate(0.45, 1.17, -knee_offw);
  fill(0,255,255);
  model(leg_right);

  pop();

  //BACK LEFT
  push();

  //ABDUCTION
  //PIVOT WORLD
  translate(-shoulder_offw, -shoulder_offh, knee_body_offl+shoulder_offl);

  rotateX(radians(180));
  rotateZ(radians(90 + joint[3][0].slider.value()));//ANGLE

  //PIVOT ITSELF
  translate(0, shoulder_body_offw, 0);

  fill(0,255,0);
  model(shoulder);

  //ROTATION
  //PIVOT WORLD
  translate(0, knee_offw, shoulder_offl);

  rotateY(radians(180+45));
  rotateY(radians(220 - joint[3][1].slider.value()));//ANGLE
  rotateZ(radians(-90));

  translate(knee_body_offw, 0.6, 5.25);

  fill(255,255,0);
  model(knee);

  //KNEE
  //PIVOT WORLD
  translate(-knee_body_offw, 0.22, -3.5);

  rotateX(radians(-55 - joint[3][2].slider.value()));//ANGLE
  rotateY(radians(-90));

  translate(knee_body_offw, 0.9, -0.8);
  fill(0,255,255);
  model(leg_left);

  pop();
  pop();
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

// robotScale = 5;
// scale(-10*robotScale);

// body_offw = 2.9/robotScale;   //IN CM, NO * 2 (CHECK WHERE THE PIVOT IS)
// body_width = 5.9/robotScale;  //NOT USED
// body_length = 11*2/robotScale;
// shoulder_offw = 2.4*2/robotScale;
// shoulder_offl = 7.65*2/robotScale;
// shoulder_offh = 0.8*2/robotScale;
// shoulder_body_offw = 2*2/robotScale;
// shoulder_offl = 2.05*2/robotScale;
// knee_offw = 0.6*2/robotScale;
// knee_body_offw = 4.1*2/robotScale;
// knee_body_offl = 4.25*2/robotScale;

// fill(0, 102, 153); // TEAL