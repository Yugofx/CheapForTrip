<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "https://api.level.travel/search/enqueue?from_city=Moscow&to_country=TR&nights=3&adults=2&start_date=12.09.2018",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "GET",
  CURLOPT_HTTPHEADER => array(
    "Accept: application/vnd.leveltravel.v3",
    "Authorization: Token token=\"46d6549cfbd1017ef62489dc64efb503\"",
    "Cache-Control: no-cache",
    "Postman-Token: 31ed3692-27be-49a3-b7e3-a1929dfc77ee"
  ),
));

$response1 = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response1;
}

$request_id = json_decode($response1);
$request_id->{'request_id'}; // 12345

$id = $request_id->{'request_id'};

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "https://api.level.travel/search/get_grouped_hotels?request_id=$id",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "GET",
  CURLOPT_HTTPHEADER => array(
    "Accept: application/vnd.leveltravel.v3",
    "Authorization: Token token=\"46d6549cfbd1017ef62489dc64efb503\"",
    "Cache-Control: no-cache",
    "Postman-Token: df30d7c9-edc6-410e-a8b3-9f4f61bae536"
  ),
));

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
