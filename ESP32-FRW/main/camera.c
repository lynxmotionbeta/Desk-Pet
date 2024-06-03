#include "camera.h"

static const char *TAG = "CAMERA MODULE";

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

    .jpeg_quality = 14,     //0-63 lower number means higher quality
    .fb_count = 2,         //if more than one, i2s runs in continuous mode. Use only with JPEG 
    .grab_mode = CAMERA_GRAB_LATEST,
    .fb_location = CAMERA_FB_IN_PSRAM,
};

bool cam_on = false; //indicates if the camera is turned off or on 

esp_err_t camera_init()
{
    //initialize the camera
    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera Init Failed");
        return err;
    }

    gpio_set_direction(CAM_PIN_PWDN, GPIO_MODE_OUTPUT);
    //Vertical and horizontal flip
    sensor_t *s = esp_camera_sensor_get();
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);   
    return ESP_OK;
}

uint32_t map(uint16_t value, uint16_t fromLow, uint16_t fromHigh, uint16_t toLow, uint16_t toHigh) {
    if (value <= fromLow) {
        return toLow;
    }
    if (value >= fromHigh) {
        return toHigh;
    }
    if (fromHigh == fromLow || toHigh == toLow) {
        return 0;
    }

    uint32_t result = (((int32_t)(value - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow)) + toLow;

    return result;
}

esp_err_t ledc_init()
{
    ledc_timer_config_t timer_conf = {
        .duty_resolution = LEDC_TIMER_13_BIT,
        .freq_hz = 5000,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .timer_num = LEDC_TIMER_0,
        .clk_cfg = LEDC_AUTO_CLK,
    };

    esp_err_t err = ledc_timer_config(&timer_conf);
    if(err != ESP_OK){
        ESP_LOGE(TAG,"Error ledc timer config: %s\n",esp_err_to_name(err));
        return err;
    }

    ledc_channel_config_t channel_conf = {
        .channel = LEDC_CHANNEL_0,
        .duty = 0,
        .gpio_num = LED_PIN,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .hpoint = 0,
        .timer_sel = LEDC_TIMER_0,
    };

    err = ledc_channel_config(&channel_conf);
    if(err != ESP_OK){
        ESP_LOGE(TAG,"Error ledc channel config: %s\n",esp_err_to_name(err));
        return err;
    }
    return ESP_OK;
}

void set_led_brightness(uint8_t brightness) 
{
    uint32_t duty = map((uint16_t)brightness, 0, 100, 0, 8191); //(2 ** 13 = 8192)
    // Set LED brightness using LEDC
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

uint8_t get_image_brightness(uint8_t* data, size_t len) 
{
    // Calculate average image pixel value
    uint32_t sum = 0;
    for (int i = 0; i < len; i++) {
        sum += data[i];
    }
    return sum / len;
}

uint8_t brightness_adjustment(camera_fb_t* fb)
{
    if (fb == NULL) {
        ESP_LOGE(TAG, "Empty camera frame");
        return 1;
    }

    int brightness = get_image_brightness(fb->buf, fb->len);
    int duty = map(brightness, 0, 255, 0, 100);
    set_led_brightness(duty);
    return 0;
}

//ToF distance sensor
vl53l0x_t *vl53l0x;

esp_err_t distance_sensor_init() 
{
    // Set up I2C and create the vl53l0x structure
    vl53l0x = vl53l0x_config(0, CAM_PIN_SIOC, CAM_PIN_SIOD, -1, 0x29, 0);
    vTaskDelay(pdMS_TO_TICKS(50));
    // Initialize the VL53L0X
    const char *error = vl53l0x_init(vl53l0x);
    if (error) {
        ESP_LOGE(TAG,"Error initializing VL53L0X: %s\n", error);
        return ESP_FAIL;
    }
    ESP_LOGI(TAG,"Successful VL53L0X initialization");
    
    return ESP_OK;
}

uint8_t read_distance(uint16_t *d) 
{
    // Read range in millimeters
    *d = vl53l0x_readRangeSingleMillimeters (vl53l0x);
    return vl53l0x_timeoutOccurred(vl53l0x);
}

void distance_sensor_deinit()
{
    // End I2C and free the structure
    vl53l0x_end(vl53l0x);
}

void distance_sensor_test(uint16_t t_seg) 
{
    // Set up I2C and create the vl53l0x structure
    vl53l0x = vl53l0x_config(0, 9, 8, -1, 0x29, 0);
    // Initialize the VL53L0X
    const char *error = vl53l0x_init(vl53l0x);
    if (error) {
        ESP_LOGE(TAG,"Error initializing VL53L0X: %s\n", error);
        return;
    }
    ESP_LOGI(TAG,"Successful VL53L0X initialization");
    vTaskDelay(pdMS_TO_TICKS(300));
    uint16_t total = 10*t_seg;
    uint16_t range = 0;
    for(uint16_t i = 0; i < total; i++) 
    {
        read_distance(&range);
        printf("Range: %dmm\n", range);
        vTaskDelay(pdMS_TO_TICKS(300));
    }

}
