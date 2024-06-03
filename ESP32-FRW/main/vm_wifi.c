#include "vm_wifi.h"

static const char *TAG = "WIFI";

QueueHandle_t xQueue_wifi = NULL;

static int s_retry_num = 0;

static void event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data){
    NetworkStatus_t *network_info = (NetworkStatus_t*) malloc(sizeof(NetworkStatus_t));

    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < CONFIG_MAXIMUM_RETRY) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGI(TAG, "retry to connect to the AP");
        }else{
            ESP_LOGI(TAG,"connect to the AP fail");
            network_info->connected = false;
            xQueueSend(xQueue_wifi, &network_info, portMAX_DELAY);
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        //ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        network_info->connected = true;
        network_info->ip = *(ip4_addr_t*)&event->ip_info.ip;
        network_info->netmask = *(ip4_addr_t*)&event->ip_info.netmask;
        xQueueSend(xQueue_wifi, &network_info, portMAX_DELAY);
        
    }
}

wifi_ap_record_t* wifi_scan( uint16_t *nets) //char* detected_networks
{
    wifi_scan_config_t scan_config = {
        .ssid = 0,
        .bssid = 0,
        .channel = 0,
        .show_hidden = false
    };

    ESP_ERROR_CHECK(esp_wifi_scan_start(&scan_config, true));

    esp_wifi_scan_get_ap_num(nets);

    wifi_ap_record_t *list_net = (wifi_ap_record_t *)malloc(sizeof(wifi_ap_record_t) * (*nets));
    ESP_ERROR_CHECK(esp_wifi_scan_get_ap_records(nets, list_net));

    return(list_net);
}

void wifi_init(const char* ssid_sta, const char* pass_sta)
{
    // Initialize network stack
    ESP_ERROR_CHECK(esp_netif_init());

    // Create default Wi-Fi AP
    esp_netif_create_default_wifi_ap();
    // Create default Wi-Fi STA
    esp_netif_create_default_wifi_sta();

    // Initialize Wi-Fi
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));

    // Set the IP address of the access point
    esp_netif_t *netif = esp_netif_get_handle_from_ifkey("WIFI_AP_DEF");
    esp_netif_ip_info_t ip_info;
    IP4_ADDR(&ip_info.ip, 192, 168, 1, 1);
    IP4_ADDR(&ip_info.gw, 192, 168, 1, 1);
    IP4_ADDR(&ip_info.netmask, 255, 255, 255, 0);
    esp_netif_dhcps_stop(netif);
    esp_netif_set_ip_info(netif, &ip_info);
    esp_netif_dhcps_start(netif);

    // Configure AP
    wifi_config_t ap_config = {
        .ap = {
            .ssid = "DeskPet",
            .ssid_len = strlen("DeskPet"),
            .password = "Lynxmotion",
            .channel = 0,
            .authmode = WIFI_AUTH_WPA2_PSK,//WIFI_AUTH_OPEN,//
            .ssid_hidden = 0,
            .max_connection = 1,
            .beacon_interval = 100
        }
    };

    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_config));
    ESP_LOGI(TAG, "AP config finished.");

    // Configure STA
    wifi_config_t sta_config = {
        .sta = {
            .ssid = CONFIG_WIFI_SSID,
            .password = CONFIG_WIFI_PASS,
            /* Setting a password implies station will connect to all security modes including WEP/WPA.
             * However these modes are deprecated and not advisable to be used. Incase your Access point
             * doesn't support WPA2, these mode can be enabled by commenting below line */
	        //.threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    if(ssid_sta != NULL && pass_sta != NULL){
        strncpy((char*) sta_config.sta.ssid, ssid_sta, sizeof(sta_config.sta.ssid));
        sta_config.sta.ssid[sizeof(sta_config.sta.ssid) - 1] = '\0';
        strncpy((char*) sta_config.sta.password, pass_sta, sizeof(sta_config.sta.password));
        sta_config.sta.password[sizeof(sta_config.sta.password) - 1] = '\0';

    }

    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_config));
    
    ESP_LOGI(TAG, "STA config finished.");
    
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT,
                                                ESP_EVENT_ANY_ID,
                                                &event_handler,
                                                NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT,
                                                IP_EVENT_STA_GOT_IP,
                                                &event_handler,
                                                NULL));

    esp_wifi_set_ps(WIFI_PS_NONE);
    ESP_ERROR_CHECK(esp_wifi_start());

}
