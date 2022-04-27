#include "wifi.h"

static int s_retry_num = 0;

void wifi_init_softap()
{
    if (strcmp(IP_ADDR, "192.168.4.1"))
    {
        int a, b, c, d;
        sscanf(IP_ADDR, "%d.%d.%d.%d", &a, &b, &c, &d);
        tcpip_adapter_ip_info_t ip_info;
        IP4_ADDR(&ip_info.ip, a, b, c, d);
        IP4_ADDR(&ip_info.gw, a, b, c, d);
        IP4_ADDR(&ip_info.netmask, 255, 255, 255, 0);
        ESP_ERROR_CHECK(tcpip_adapter_dhcps_stop(WIFI_IF_AP));
        ESP_ERROR_CHECK(tcpip_adapter_set_ip_info(WIFI_IF_AP, &ip_info));
        ESP_ERROR_CHECK(tcpip_adapter_dhcps_start(WIFI_IF_AP));
    }
    wifi_config_t wifi_config;
    memset(&wifi_config, 0, sizeof(wifi_config_t));
    snprintf((char *)wifi_config.ap.ssid, 32, "%s", WIFI_AP_SSID);
    wifi_config.ap.ssid_len = strlen((char *)wifi_config.ap.ssid);
    snprintf((char *)wifi_config.ap.password, 64, "%s", WIFI_AP_PASS);
    wifi_config.ap.max_connection = MAX_STA_CONN;
    wifi_config.ap.authmode = WIFI_AUTH_WPA_WPA2_PSK;
    if (strlen(WIFI_AP_PASS) == 0)
    {
        wifi_config.ap.authmode = WIFI_AUTH_OPEN;
    }
    if (strlen(WIFI_AP_CHANNEL))
    {
        int channel;
        sscanf(WIFI_AP_CHANNEL, "%d", &channel);
        wifi_config.ap.channel = channel;
    }

    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_AP, &wifi_config));

    ESP_LOGI("WIFI", "wifi_init_softap finished.SSID:%s password:%s",
             WIFI_AP_SSID, WIFI_AP_PASS);
}

void wifi_init_sta()
{
    wifi_config_t wifi_config;
    memset(&wifi_config, 0, sizeof(wifi_config_t));
    snprintf((char *)wifi_config.sta.ssid, 32, "%s", WIFI_SSID);
    snprintf((char *)wifi_config.sta.password, 64, "%s", WIFI_PASS);

    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_STA, &wifi_config));

    ESP_LOGI("WIFI", "wifi_init_sta finished.");
    ESP_LOGI("WIFI", "connect to ap SSID:%s password:%s",
             WIFI_SSID, WIFI_PASS);
}

static esp_err_t event_handler(void *ctx, system_event_t *event)
{
    switch (event->event_id)
    {
    case SYSTEM_EVENT_AP_STACONNECTED:
        ESP_EARLY_LOGI("WIFI", "station:" MACSTR " join, AID=%d",
                       MAC2STR(event->event_info.sta_connected.mac),
                       event->event_info.sta_connected.aid);
        break;
    case SYSTEM_EVENT_AP_STADISCONNECTED:
        ESP_EARLY_LOGI("WIFI", "station:" MACSTR "leave, AID=%d",
                       MAC2STR(event->event_info.sta_disconnected.mac),
                       event->event_info.sta_disconnected.aid);
        break;
    case SYSTEM_EVENT_STA_START:
        esp_wifi_connect();
        break;
    case SYSTEM_EVENT_STA_GOT_IP:
        ESP_EARLY_LOGI("WIFI", "got ip:%s",
                       ip4addr_ntoa(&event->event_info.got_ip.ip_info.ip));
        s_retry_num = 0;
        break;
    case SYSTEM_EVENT_STA_DISCONNECTED:
    {
        if (s_retry_num < MAXIMUM_RETRY)
        {
            esp_wifi_connect();
            s_retry_num++;
            ESP_EARLY_LOGI("WIFI", "retry to connect to the AP");
        }
        ESP_EARLY_LOGI("WIFI", "connect to the AP fail");
        break;
    }
    default:
        break;
    }
    mdns_handle_system_event(ctx, event);
    return ESP_OK;
}

void wifi_main()
{

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    wifi_mode_t mode = WIFI_MODE_NULL;

    if (strlen(WIFI_AP_SSID) && strlen(WIFI_SSID))
    {
        mode = WIFI_MODE_APSTA;
    }
    else if (strlen(WIFI_AP_SSID))
    {
        mode = WIFI_MODE_AP;
    }
    else if (strlen(WIFI_SSID))
    {
        mode = WIFI_MODE_STA;
    }

    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    

    if (mode == WIFI_MODE_NULL)
    {
        ESP_LOGW("WIFI", "Neither AP or STA have been configured. WiFi will be off.");
        return;
    }

    tcpip_adapter_init();
    ESP_ERROR_CHECK(esp_event_loop_init(event_handler, NULL));
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_mode(mode));

    if (mode & WIFI_MODE_AP)
    {
        wifi_init_softap();
    }

    if (mode & WIFI_MODE_STA)
    {
        wifi_init_sta();
    }

    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));
}