/// Ultrasonic Senso/

// defines pins numbers

//Ultrasonido 
const int trigPin = 9;
const int echoPin = 8;
//Ultrasonido2
const int trigPin2 = 11;
const int echoPin2 = 10;
// defines variables ultrasonido
long duration;
int distance;
// defines variables ultrasonido2
long duration2;
int distance2;

void setup() {
Serial.begin(9600); // Starts the serial communication
//Ultrasonido1
pinMode(trigPin, OUTPUT); // Sets the trigPin as an Output
pinMode(echoPin, INPUT); // Sets the echoPin as an Input
//Ultrasonido2
pinMode(trigPin2, OUTPUT); // Sets the trigPin as an Output
pinMode(echoPin2, INPUT); // Sets the echoPin as an Inpu

}

void loop(){
  if(Serial.available()){
    delay(10);
// Clears the trigPin
digitalWrite(trigPin, LOW);
delayMicroseconds(2);


// Sets the trigPin on HIGH state for 10 micro seconds
digitalWrite(trigPin, HIGH);
delayMicroseconds(10);
digitalWrite(trigPin, LOW);

// Reads the echoPin, returns the sound wave travel time in microseconds
duration = pulseIn(echoPin, HIGH);


// Calculating the distance Ultrasonido
distance= duration/74/2;

// Prints the distance on the Serial Monitor
Serial.print("Distance: ");
Serial.println(distance);

//Clears the trigPin2
digitalWrite(trigPin2, LOW);
delayMicroseconds(2);

// Sets the trigPin2 on HIGH state for 10 micro seconds
digitalWrite(trigPin2, HIGH);
delayMicroseconds(10);
digitalWrite(trigPin2, LOW);

// Reads the echoPin2, returns the sound wave travel time in microseconds
duration2 = pulseIn(echoPin2, HIGH);

// Calculating the distance Ultrasonido2
distance2= duration2/74/2;

// Prints the distance on the Serial Monitor
Serial.print("Distance2: ");
Serial.println(distance2);
}
}
