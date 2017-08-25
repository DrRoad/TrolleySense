#include <ESP8266WiFi.h>
#include <WiFiClient.h> 
#include <ESP8266WebServer.h>

/* Set these to your desired credentials. */
const char *ssid = "ConTrolley";
const char *password = "thereisnospoon";

const int trigPin = 5;
const int echoPin = 4;

//Ultrasonido2
const int trigPin2 = 0;
const int echoPin2 = 2;

int distance, distance2;

bool sensor1Activated = false, sensor2Activated = false;

int countIncoming = 0, countOutgoing = 0;

const long interval = 250;
unsigned long previousMillis = 0;

ESP8266WebServer server(80);

void handleRoot() {
  String stringOne = "{\"incomingCount\":";
  stringOne += countIncoming;
  stringOne += ", \"outgoingCount\":";
  stringOne += countOutgoing;
  stringOne += "}";
  
  server.send(200, "application/json", stringOne);
}

void cleanRoot() {
  countIncoming = 0;
  countOutgoing = 0;
  server.send(200, "application/json", "{\"msg\":\"Clean Data...\"}");
}

void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();
  Serial.print("Configuring access point...");
  /* You can remove the password parameter if you want the AP to be open. */
  WiFi.softAP(ssid, password);

  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  server.on("/", handleRoot);
  server.on("/clean", cleanRoot);
  server.begin();
  Serial.println("HTTP server started");

  //Ultrasonido1
  pinMode(trigPin, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin, INPUT); // Sets the echoPin as an Input


  pinMode(trigPin2, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin2, INPUT); // Sets the echoPin as an Inpu
}

int getDistanceFromSensor(int trig, int echo){
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  return (pulseIn(echo, HIGH) / 2) / 29.1; //29.1
}

void loop() {
  server.handleClient();

  if(getDistanceFromSensor(trigPin, echoPin) <= 15){
    Serial.println("Entering...");
    sensor1Activated = true;
  }

  if(getDistanceFromSensor(trigPin2, echoPin2) <= 15){
    Serial.println("Exiting...");
    sensor2Activated = true;
  }

  while(sensor1Activated == true && sensor2Activated == false){
    server.handleClient();
    if(getDistanceFromSensor(trigPin2, echoPin2) <= 15){
      Serial.println("ENTERED");
      sensor1Activated = false;
      sensor2Activated = false;
      countIncoming += 1;
      delay(250);
      break;
    }
  }

  while(sensor2Activated == true && sensor1Activated == false){
    server.handleClient();
    if(getDistanceFromSensor(trigPin, echoPin) <= 15){
      Serial.println("EXITING");
      sensor1Activated = false;
      sensor2Activated = false;
      countOutgoing += 1;
      delay(250);
      break;
    }
  }
}
