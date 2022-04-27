
#include "camera.h"

static camera_config_t camera_config = {
    .pin_pwdn = CAM_PIN_PWDN,
    .pin_reset = CAM_PIN_RESET,
    .pin_xclk = CAM_PIN_XCLK,
    .pin_sscb_sda = CAM_PIN_SIOD,
    .pin_sscb_scl = CAM_PIN_SIOC,

    .pin_d7 = CAM_PIN_D7,
    .pin_d6 = CAM_PIN_D6,
    .pin_d5 = CAM_PIN_D5,
    .pin_d4 = CAM_PIN_D4,
    .pin_d3 = CAM_PIN_D3,
    .pin_d2 = CAM_PIN_D2,
    .pin_d1 = CAM_PIN_D1,
    .pin_d0 = CAM_PIN_D0,
    .pin_vsync = CAM_PIN_VSYNC,
    .pin_href = CAM_PIN_HREF,
    .pin_pclk = CAM_PIN_PCLK,

    //XCLK 20MHz or 10MHz for OV2640 double FPS (Experimental)
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,

    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_HD,

    .jpeg_quality = 5,     //0-63 lower number means higher quality
    .fb_count = 2,         //if more than one, i2s runs in continuous mode. Use only with JPEG      //JPEG TEST 3
    .grab_mode = CAMERA_GRAB_LATEST,
};


esp_err_t init_camera()
{
    //initialize the camera
    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK)
    {
        ESP_LOGE("CAMERA", "Camera Init Failed");
        return err;
    }

    return ESP_OK;
}

void camera_main(){

    if(ESP_OK != init_camera()) {
        return;
    }

    // For testing
    ESP_EARLY_LOGI("CAMERA", "Taking picture...");
    camera_fb_t *pic = esp_camera_fb_get();
    ESP_LOGI("CAMERA", "Picture taken! Its size was: %zu bytes", pic->len);

}
