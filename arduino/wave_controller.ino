const int potPin = A0;  // 可調式電阻接在 A0 腳位

void setup() {
  Serial.begin(9600);  // 初始化序列通訊
}

void loop() {
  int potValue = analogRead(potPin);  // 讀取可調式電阻值 (0-1023)
  Serial.println(potValue);  // 發送數值到序列埠
  delay(50);  // 短暫延遲以避免發送太多數據
}