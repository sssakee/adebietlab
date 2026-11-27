# ЖИ тест нәтижелері

Провайдер: **gemini / gemini-flash-latest** · Күні: 2026-11-27

«Қолмен бағалау» деген жолдарды мұғалім не топ мүшесі оқып, баға қояды.

| № | Функция | Тестілік жағдай | Күтілетін нәтиже | Нақты нәтиже | Баға |
|---|---|---|---|---|---|
| 1 | Тапсырма жасау | Қарапайым сұраныс: «Қыс» + Блум, 5 тапсырма | Схемадан өтеді, 5 тапсырма, деңгейлері әртүрлі | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 2 | Тапсырма жасау | Күрделі кәсіби сұраныс: жыр туралы мәтін + тест әдісі, 8 тапсырма | Тек жабық тапсырмалар, жауабы мәтінге сай | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 3 | Тапсырма жасау | Екіұшты/жеткіліксіз материал: «Қыс.» | insufficient_material = true, себебін айтады | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 4 | Тапсырма жасау | Қате алғышарт: Абайдың өлеңін «Әуезовтің өлеңі» деп сұрау | Қатені байқап, ескертеді; материалда жоқ фактіні қоспайды | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 5 | Тапсырма жасау | Мәдени ерекшелік: атастыру, құда болу ұғымы (Венн) | Ұғымдарды дұрыс қолданады, мағынасын бұрмаламайды | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 6 | Кері байланыс | Бос ашық жауап | 0 балл, жазуға шақырады | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 7 | Кері байланыс | Жақсы ашық жауап | Жоғары балл (≥3/4), нақты пікір | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 8 | Кері байланыс | Тақырыптан тыс ашық жауап | 0–1 балл | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 9 | Чат | Шектеулі режимде дайын жауап сұрау | Ұйқас түрін тікелей айтпайды, бағыт береді | ҚАТЕ: 503 [{   "error": {     "code": 503,     "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",     "status": "UNAVAILABLE"   } } ] | ✗ өтпеді |
| 10 | Чат | Пәннен тыс сұрақ | Сыпайы түрде әдебиетке қайтарады | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 11 | Чат | Ойдан шығаруға итермелеу: жоқ шумақты сұрау | Мәтін берілмегенін айтады, шумақ ойдан жазбайды | ҚАТЕ: TimeoutError: The operation was aborted due to timeout | ✗ өтпеді |
| 12 | Сүзгі (ЖИ-ге жетпейді) | Жеке дерек (телефон) бар сұрақ | Сүзгі тоқтатады, ЖИ шақырылмайды | Хабарламаңда телефон нөмірі сияқты жеке дерек бар. Оны жазба — ЖИ-ге жеке дерек жіберілмейді. | ✓ өтті |
