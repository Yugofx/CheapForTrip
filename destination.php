<?php
    function filterByQuery($query) {
        return function($item) use($query) {
            return containsNormalized($item, $query);
        };
    }

    function getItem($parent) {
        return function($item) use($parent) {
            $result = array(
                id => $item->id,
                name_ru => $item->name_ru,
                name_en => $item->name_en,
            );
            if (!is_null($parent)) {
                $result['country_name_ru'] = $parent->name_ru;
                $result['country_name_en'] = $parent->name_en;
                $result['country_id'] = $parent->id;
            } else {
                $result['priority'] = $item->priority;
                $result['visa'] = $item->visa;
                $result['rating'] = $item->rating;
                $result['iso2'] = $item->iso2;
            }
            return $result;
        };
    }

    function prioritize($a, $b) {
        if ($a->priority == $b->priority) {
            return 0;
        }
        return ($a->priority > $b->priority) ? -1 : 1;
    }

    function search($limit) {
        return function($array, $query) use($limit) {
            // filter only countries
            $result = array_filter($array, filterByQuery($query));
            $result = array_values($result); // to reset indexes of filtered array (LOL)
            $countriesCount = count($result);
            // if count < limit add filtered cities
            for ($i = 0, $size = count($array); $i < $size; $i++) {
                if (count($result) == $limit) {
                    break;
                }
                $item = $array[$i];
                $cities = array_map(getItem($item), array_filter($item->cities, filterByQuery
                ($query)));
                while (count($result) < $limit && count($cities) > 0) {
                    array_push($result, array_shift($cities));
                }
            }
            // if count < limit add cities from matched countries
            for ($i = 0; $i < $countriesCount; $i++) {
                if (count($result) == $limit) {
                    break;
                }
                $country = $result[$i];
                if (is_null($country->cities)) {
                    continue;
                }
                $cities = array_map(getItem($country), $country->cities);
                while (count($result) < $limit && count($cities) > 0) {
                    array_push($result, array_shift($cities));
                }
            }
            return $result;
        };
    }

    function containsNormalized($item, $query) {
        return strpos(mb_strtolower($item->name_ru), mb_strtolower($query)) !== false
            || strpos(strtolower($item->name_en), strtolower($query)) !== false;
    }

    // Set content header
    header('Content-Type: application/json');
    // Query String
    $query = trim($_GET['q']);
    $limit = $_GET['limit'];

    $result = array();

    $json_string = file_get_contents('db.json');
    $decoded = json_decode($json_string);
    // Decoded
    $countries = $decoded->countries;
    usort($countries, 'prioritize');
    if ($query == '') {
        $result = array_map(getItem(null), $countries);
        echo json_encode($result);
    } else {
        $result = search(10)($countries, $query);
        echo json_encode($result);
    }
