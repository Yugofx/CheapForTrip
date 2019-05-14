<?php
    include 'get_data.php';

    $sortBy = $_GET['sort_by'];
    $filterStars = $_GET['filter_stars'];

    echo array('sort' => $sortBy,
               'stars' => $filterStars);
