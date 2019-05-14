<?php
    echo '
        <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>Tour Filter</title>
                <link rel="stylesheet" href="tours/flags.css">
                <link rel="stylesheet" href="tours/city.css">
                <link rel="stylesheet" href="tours/calendar.css">
                <link rel="stylesheet" href="tours/counter.css">
            </head>
            <body>
                <main class="wrapper row">
                    <section class="adviser">
                        <div class="autocomplete destination">
                            <input type="text" placeholder="Страна Город или Отель">
                            <button class="reset-button"></button>
                        </div>
                        <div class="y-calendar-input">
                            <div class="y-calendar"></div>
                        </div>
                        <div class="days-counter"></div>
                        <div class="person-counter"></div>
                        <div class="autocomplete departure">
                            <input type="text" placeholder="Откуда">
                            <button class="reset-button"></button>
                        </div>
                        <button class="send">Найти</button>
                    </section>
                </main>
                <button type="button" class="range-button">&plusmn; 2</button>
                <script src="tours/utils.js"></script>
                <script src="tours/elba.js"></script>
                <script src="tours/tip.js"></script>
                <script src="tours/calendar.js"></script>
                <script src="tours/counter.js"></script>
                <script src="tours/autocomplete.js"></script>
                <script src="tours/TourSearchFacade.js"></script>
            </body>
        </html>
    ';