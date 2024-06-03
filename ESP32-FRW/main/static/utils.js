//////////////////// UTILS

const hide = el => {
    el.classList.remove('visible');
    el.classList.add('hidden');
    //el.hidden = true;
}

const show = el => {
    el.classList.remove('hidden');
    el.classList.add('visible');
    //el.hidden = false;
}

function sleep(ms) {
    //return new Promise(resolve => setTimeout(resolve, ms));
    return new Promise(resolve => {
        if (ms === 0) {
            (async () => {
                while (true) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            })();
        } else {
            setTimeout(resolve, ms);
        }
    });
}

function limitToRange(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

const buttonBackgroundColor = {
    disable: 'rgb(153, 153, 153)',
    enable: 'rgb(57, 57, 57)',
    pressed: 'rgb(87, 87, 87)'

};

const disable = el => {
    el.classList.add('disabled');
    el.disabled = true;
    notPressed(el);
    el.style.background = (buttonBackgroundColor.disable);
}

const enable = el => {
    el.classList.remove('disabled');
    el.disabled = false;
    el.style.background = (buttonBackgroundColor.enable);
}

const notPressed = el => {
    //ctx.clearRect(0, 0, canvas.width, canvas.height)
    el.style.background = (buttonBackgroundColor.enable);
    switch (el.innerHTML) {
        case '<img src="/arrow-bar-right.svg">':
            el.innerHTML = '<img src="/arrow-bar-left.svg">';
            break;
        case '<img src="/arrow-bar-left.svg">':
            el.innerHTML = '<img src="/arrow-bar-right.svg">';
            break;
    }
}

const pressed = el => {
    el.style.background = (buttonBackgroundColor.pressed);
    switch (el.innerHTML) {
        case '<img src="/arrow-bar-right.svg">':
            el.innerHTML = '<img src="/arrow-bar-left.svg">';
            break;
        case '<img src="/arrow-bar-left.svg">':
            el.innerHTML = '<img src="/arrow-bar-right.svg">';
            break;
    }
}

const isPressed = el => {
    return (el.style.background === (buttonBackgroundColor.pressed));
}

const isEnable = el => {
    return (el.style.background === (buttonBackgroundColor.enable));
}

const overlay = document.querySelector('.overlay');
const alertCard = document.getElementById('alert-card');
const alertButton = alertCard.querySelector('button');
const alertMSG = alertCard.querySelector('p');
const alertTitle = alertCard.querySelector('h2');

alertButton.addEventListener('click', () => {
    //Hide Alert card
    alertCard.classList.add("hidden");
    // Unblock interface
    overlay.style.display = 'none';
});

function alertMessage(title, msg = "", buttonText = "Accept") {
    if (!title) {
        console.error("Title is required for alertMessage function.");
        return;
    }
    alertTitle.innerText = title;
    alertMSG.innerText = msg;
    alertButton.innerHTML = buttonText;

    alertCard.classList.remove("hidden");
    //Block interface
    overlay.style.display = 'flex';
}

const waitCard = document.getElementById('waiting-card');
const waitErrorMSG = document.getElementById('connection-msg');
const waitMSG = waitCard.querySelector('p');
const waitTitle = waitCard.querySelector('h2');

async function waitMessage(callback, title, msg = "", errorMSG = "", args = []) {

    if (!title) {
        console.error("Title is required for withLoadingOverlay function.");
        return;
    }

    // Set the title, message, and button text
    waitTitle.innerText = title;
    waitMSG.innerText = msg;
    waitErrorMSG.innerText = errorMSG;

    // Show overlay and waiting card
    waitCard.classList.remove("hidden");
    overlay.style.display = 'flex';

    var result = null;

    // Execute the provided function
    try {
        result = await callback(...args);
    } catch (error) {
        console.log("Error executing function " + callback.name);
        console.error(error);
        result = null;
    } finally {
        // Hide overlay and waiting card after executing the function
        waitCard.classList.add("hidden");
        overlay.style.display = 'none';
        return result;
    }
}

export { hide, show, sleep, limitToRange, enable, disable, pressed, notPressed, isPressed, isEnable, alertMessage, waitMessage };