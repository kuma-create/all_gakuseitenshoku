<?php

	if(defined("PHP_VERSION_ID"))
		$version = PHP_VERSION_ID;
	else
		$version = 0;

	$p_key = "p";
	$link_keys = array(
		array("cid", "CL_", "ACT_"),
		array("plid", "PL_", "APT_"),
	);

	$p_val = isset($_GET[$p_key]) ? $_GET[$p_key] : null;

	if(!ctype_alnum($p_val)) return;

	foreach($link_keys as $key)
	{
		if(!is_array($key)) continue;

		if(isset($key[0]))
		{
			$val = isset($_GET[$key[0]]) ? $_GET[$key[0]] : null;
		}

		if(!ctype_alnum($val)) continue;

		$expires = time() + 63072000;
		$path = "/";
		$secure = true;
		$samesite = "None";

		if($version >= 70300)
		{
			$options = array("expires" => $expires, "path" => $path, "secure" => $secure, "samesite" => $samesite);
			if(isset($key[1])) setcookie($key[1].$p_val, $val, $options);
			if(isset($key[2])) setcookie($key[2].$p_val, "php", $options);
		}
		else
		{
			$options = $path."; SameSite=".$samesite;
			if(isset($key[1])) setcookie($key[1].$p_val, $val, $expires, $options, "", $secure);
			if(isset($key[2])) setcookie($key[2].$p_val, "php", $expires, $options, "", $secure);
		}
	}
