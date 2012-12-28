<?php 
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Content-type: application/json');

$customers = array(
	1 => array("id" => 1, "company" => "Customer 1"),
	2 => array("id" => 2, "company" => "Customer 2"),
	3 => array("id" => 3, "company" => "Customer 3")
);

$id = (isset($_GET['id'])) ? $_GET['id'] : null;

if( $id == null ) {
	sleep(3);
	echo json_encode($customers);
} else {
	sleep(2);
	echo json_encode($customers[$id]);
}

?>