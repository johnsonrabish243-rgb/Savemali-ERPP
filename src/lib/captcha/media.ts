import type { MediaItem, Language } from "./types"

export const MEDIA_CATEGORIES = [
  "cars", "motorcycles", "buses", "bicycles",
  "traffic_lights", "crosswalks",
  "cats", "dogs", "birds", "horses", "elephants", "lions", "fish",
  "flowers", "trees", "mountains", "oceans",
  "airplanes", "boats", "buildings", "bridges", "roads", "signs",
  "food", "fruits", "vegetables",
  "tools", "phones", "computers",
  "books", "pens", "bags", "shoes", "clothes", "watches", "toys",
  "people_men", "people_women", "people_children", "people_seniors",
] as const

export type MediaCategory = typeof MEDIA_CATEGORIES[number]

export const CATEGORY_LABELS_FR: Record<string, string> = {
  cars: "Voitures", motorcycles: "Motos", buses: "Bus", bicycles: "Vélos",
  traffic_lights: "Feux de circulation", crosswalks: "Passages piétons",
  cats: "Chats", dogs: "Chiens", birds: "Oiseaux", horses: "Chevaux",
  elephants: "Éléphants", lions: "Lions", fish: "Poissons",
  flowers: "Fleurs", trees: "Arbres", mountains: "Montagnes", oceans: "Océans",
  airplanes: "Avions", boats: "Bateaux", buildings: "Bâtiments",
  bridges: "Ponts", roads: "Routes", signs: "Panneaux",
  food: "Nourriture", fruits: "Fruits", vegetables: "Légumes",
  tools: "Outils", phones: "Téléphones", computers: "Ordinateurs",
  books: "Livres", pens: "Stylos", bags: "Sacs", shoes: "Chaussures",
  clothes: "Vêtements", watches: "Montres", toys: "Jouets",
  people_men: "Hommes", people_women: "Femmes",
  people_children: "Enfants", people_seniors: "Seniors",
}

export const CATEGORY_LABELS_EN: Record<string, string> = {
  cars: "Cars", motorcycles: "Motorcycles", buses: "Buses", bicycles: "Bicycles",
  traffic_lights: "Traffic lights", crosswalks: "Crosswalks",
  cats: "Cats", dogs: "Dogs", birds: "Birds", horses: "Horses",
  elephants: "Elephants", lions: "Lions", fish: "Fish",
  flowers: "Flowers", trees: "Trees", mountains: "Mountains", oceans: "Oceans",
  airplanes: "Airplanes", boats: "Boats", buildings: "Buildings",
  bridges: "Bridges", roads: "Roads", signs: "Signs",
  food: "Food", fruits: "Fruits", vegetables: "Vegetables",
  tools: "Tools", phones: "Phones", computers: "Computers",
  books: "Books", pens: "Pens", bags: "Bags", shoes: "Shoes",
  clothes: "Clothes", watches: "Watches", toys: "Toys",
  people_men: "Men", people_women: "Women",
  people_children: "Children", people_seniors: "Seniors",
}

const CATEGORY_IMAGES: Record<string, string[]> = {
  cars: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=200&h=200&fit=crop",
  ],
  motorcycles: [
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1525160354320-d84806810a03?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1621866020038-d5b6c1ee0b7e?w=200&h=200&fit=crop",
  ],
  buses: [
    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1596434196678-21ae6dab5eb3?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1567789884554-0b00b897c8e3?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1515165076831-77937fa1bd13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=200&h=200&fit=crop",
  ],
  bicycles: [
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop",
  ],
  traffic_lights: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1579540954661-abae7da95323?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1616432043562-3671ea2e5242?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=200&h=200&fit=crop",
  ],
  crosswalks: [
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571513712016-3985e6c2f022?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573152958711-1e013487de44?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1597766659890-4e95ef1f4600?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=200&h=200&fit=crop",
  ],
  cats: [
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571573180079-4c10c2c1b5d9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&h=200&fit=crop",
  ],
  dogs: [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1561030367-9b5c5eb81e74?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583511655826-05700442b31b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583511655826-05700442b31b?w=200&h=200&fit=crop",
  ],
  birds: [
    "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1580457724535-c1c3b2d68f80?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1551085254-e96b210db58a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1591198936750-16d8e15edb9e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1555169062-013468b47731?w=200&h=200&fit=crop",
  ],
  horses: [
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1508766917616-d22f3f1e4982?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1508974239320-0a0294978a18?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1508766917616-d22f3f1e4982?w=200&h=200&fit=crop",
  ],
  elephants: [
    "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1549366021-9f761d450615?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581852017103-68e2e0e84a74?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=200&h=200&fit=crop",
  ],
  lions: [
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1551972883-b0e980d462cd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&h=200&fit=crop",
  ],
  fish: [
    "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1520302630581-9a1a328e1819?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1518467166681-60894704cf0d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1582967788606-a171c205c6f8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=200&h=200&fit=crop",
  ],
  flowers: [
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=200&h=200&fit=crop",
  ],
  trees: [
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1446034295857-c39f8844fad4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1509316975890-9f6f529a2c45?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1446034295857-c39f8844fad4?w=200&h=200&fit=crop",
  ],
  mountains: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
  ],
  oceans: [
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1484291470158-b0f94106a641?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop",
  ],
  airplanes: [
    "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1569629743806-6a488e4b4d4b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1559628233-100c91637d2e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1569629743806-6a488e4b4d4b?w=200&h=200&fit=crop",
  ],
  boats: [
    "https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1500932334607-3b4d7c0a28a9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519583272095-6433daf26536?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1568791687555-3e3877145cee?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1500932334607-3b4d7c0a28a9?w=200&h=200&fit=crop",
  ],
  buildings: [
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop",
  ],
  bridges: [
    "https://images.unsplash.com/photo-1513415564515-763d91423bdd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1527576539890-dfa8156483ff?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1513415564515-763d91423bdd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200&h=200&fit=crop",
  ],
  roads: [
    "https://images.unsplash.com/photo-1515165076831-77937fa1bd13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1515165076831-77937fa1bd13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=200&h=200&fit=crop",
  ],
  signs: [
    "https://images.unsplash.com/photo-1568429585130-1d42b5e7e24b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1586953208222-924c15766e20?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1568429585130-1d42b5e7e24b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=200&h=200&fit=crop",
  ],
  food: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop",
  ],
  fruits: [
    "https://images.unsplash.com/photo-1619992271408-3e8046084d0c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1619546813908-d6362e1525d0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1619992271408-3e8046084d0c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=200&h=200&fit=crop",
  ],
  vegetables: [
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&h=200&fit=crop",
  ],
  tools: [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1530124566582-a45a7c7cee34?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=200&h=200&fit=crop",
  ],
  phones: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&h=200&fit=crop",
  ],
  computers: [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",
  ],
  books: [
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop",
  ],
  pens: [
    "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1517842645767-c639042777db?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&h=200&fit=crop",
  ],
  bags: [
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop",
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=200&h=200&fit=crop",
  ],
  clothes: [
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1434389677669-e08b4cda3a40?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop",
  ],
  watches: [
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1459908676235-d5f02a50184b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=200&h=200&fit=crop",
  ],
  toys: [
    "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1608889335941-32ac5f00852f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200&h=200&fit=crop",
  ],
  people_men: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop",
  ],
  people_women: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  ],
  people_children: [
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1518802191447-34e3e19bae37?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1526630627946-51e3c7e37e18?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1540479859555-17af45c78602?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1520350094754-f0fdcac35c1c?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&h=200&fit=crop",
  ],
  people_seniors: [
    "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579532413-74ab7dbeaa34?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1559839914-17aae1935cb5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1556911073-38141961746f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579532413-74ab7dbeaa34?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579532413-74ab7dbeaa34?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1581579532413-74ab7dbeaa34?w=200&h=200&fit=crop",
  ],
}

const STORAGE_KEY = "savemali_captcha_media"

export class MediaLibrary {
  private items: MediaItem[]
  private listeners: Set<() => void>

  constructor() {
    this.items = this.load()
    this.listeners = new Set()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((l) => l())
  }

  private load(): MediaItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return this.shuffle(parsed)
      }
      return this.getDefaultItems()
    } catch {
      return this.getDefaultItems()
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
    } catch { }
  }

  getItems(): MediaItem[] {
    return [...this.items]
  }

  getByCategory(category: string): MediaItem[] {
    return this.items.filter((m) => m.category === category)
  }

  getCategories(): string[] {
    return [...new Set(this.items.map((m) => m.category))].sort()
  }

  addItem(item: MediaItem): void {
    this.items.push(item)
    this.save()
    this.notify()
  }

  removeItem(id: string): void {
    this.items = this.items.filter((m) => m.id !== id)
    this.save()
    this.notify()
  }

  updateItem(id: string, updates: Partial<MediaItem>): void {
    const idx = this.items.findIndex((m) => m.id === id)
    if (idx !== -1) {
      this.items[idx] = { ...this.items[idx], ...updates }
      this.save()
      this.notify()
    }
  }

  clear(): void {
    this.items = []
    this.save()
    this.notify()
  }

  getByDifficulty(min: number, max: number): MediaItem[] {
    return this.items.filter((m) => m.difficulty >= min && m.difficulty <= max)
  }

  getCount(): number {
    return this.items.length
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  private getDefaultItems(): MediaItem[] {
    const items: MediaItem[] = []
    let id = 0

    const cats = this.shuffle(Object.keys(CATEGORY_IMAGES))

    cats.forEach((cat) => {
      const urls = this.shuffle(CATEGORY_IMAGES[cat])
      urls.forEach((url) => {
        items.push({
          id: `media_${id++}`,
          category: cat,
          tags: [cat],
          url,
          thumbnailUrl: url,
          difficulty: 1 + Math.floor(Math.random() * 5),
          width: 200,
          height: 200,
        })
      })
    })

    return items
  }
}

let _instance: MediaLibrary | null = null

export function getMediaLibrary(): MediaLibrary {
  if (!_instance) _instance = new MediaLibrary()
  return _instance
}

export function getCategoryLabel(category: string, lang: Language): string {
  const labels = lang === "fr" ? CATEGORY_LABELS_FR : CATEGORY_LABELS_EN
  return labels[category] ?? category
}
