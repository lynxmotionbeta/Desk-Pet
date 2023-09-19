//////////////////// UTILS

const hide = el => {
    el.classList.add('hidden');
    el.hidden = true;
}

const show = el => {
    el.classList.remove('hidden');
    el.hidden = false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, cb) {
    fetch(url)
        .then(function (response) {
            if (response.status !== 200) {
                cb(response.status, response.statusText);
            } else {
                response.text().then(function (data) {
                    cb(200, data);
                }).catch(function (err) {
                    cb(-1, err);
                });
            }
        })
        .catch(function (err) {
            cb(-1, err);
        });
}

function checkIfValidIP(str) {
    // Regular expression pattern for a valid IPv4 address
    const regexExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;

    // Test the string against the regular expression pattern
    return regexExp.test(str);
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
        case '<i class="bi-camera-video-off"></i>':
            el.innerHTML = '<i class="bi-camera-video"></i>'
            break;
        case '<i class="bi-stoplights-fill"></i>':
            el.innerHTML = '<i class="bi-stoplights"></i>'
            break;
        case '<i class="bi-check-square"></i>':
            el.innerHTML = '<i class="bi-bounding-box"></i>'
            break;
        case '<i class="bi-person-square"></i>':
            el.innerHTML = '<i class="bi-person-bounding-box"></i>'
            break;
        case '<i class="bi-person-check-fill"></i>':
            el.innerHTML = '<i class="bi-person-check"></i>'
            break;
        case '<i class="bi-person-plus-fill"></i>':
            el.innerHTML = '<i class="bi-person-plus"></i>'
            break;
        case '<i class="bi-gear-fill"></i>':
            el.innerHTML = '<i class="bi-gear"></i>'
            break;
        case '<i class="bi-info-circle-fill"></i>':
            el.innerHTML = '<i class="bi-info-circle"></i>'
            break;
    }
}

const pressed = el => {
    el.style.background = (buttonBackgroundColor.pressed);
    switch (el.innerHTML) {
        case '<i class="bi-camera-video"></i>':
            el.innerHTML = '<i class="bi-camera-video-off"></i>'
            break;
        case '<i class="bi-stoplights"></i>':
            el.innerHTML = '<i class="bi-stoplights-fill"></i>'
            break;
        case '<i class="bi-bounding-box"></i>':
            el.innerHTML = '<i class="bi-check-square"></i>'
            break;
        case '<i class="bi-person-bounding-box"></i>':
            el.innerHTML = '<i class="bi-person-square"></i>'
            break;
        case '<i class="bi-person-check"></i>':
            el.innerHTML = '<i class="bi-person-check-fill"></i>'
            break;
        case '<i class="bi-person-plus"></i>':
            el.innerHTML = '<i class="bi-person-plus-fill"></i>'
            break;
        case '<i class="bi-gear"></i>':
            el.innerHTML = '<i class="bi-gear-fill"></i>'
            break;
        case '<i class="bi-info-circle"></i>':
            el.innerHTML = '<i class="bi-info-circle-fill"></i>'
            break;
    }
}

const isPressed = el => {
   return(el.style.background === (buttonBackgroundColor.pressed));
}

const isEnable = el => {
    return(el.style.background === (buttonBackgroundColor.enable));
 }

export { hide, show, sleep, limitToRange, checkIfValidIP, enable, disable, pressed, notPressed, isPressed, isEnable};