import requests
from bs4 import BeautifulSoup
import json

# Config PocketBase
PB_URL = "http://localhost:8080/api"
HEADERS = {"Content-Type": "application/json"}

# Lista de búsquedas populares
BUSQUEDAS_POPULARES = [
    "Le Male Elixir", "Dior Sauvage", "Bleu de Chanel", "Acqua di Gio", "Creed Aventus",
    "1 Million", "La Vie Est Belle", "Black Opium", "Armani Code", "Good Girl",
    "Invictus", "Alien", "L'interdit", "Light Blue", "Eros", "Angel", "YSL Libre",
    "Tom Ford Noir", "Gucci Bloom", "Boss Bottled"
]

def crear_perfume(data_perfume):
    url = f"{PB_URL}/collections/perfumes/records"
    try:
        r = requests.post(url, json=data_perfume, headers=HEADERS)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        if r.status_code == 400:
            print(f"[!] Posible duplicado: {data_perfume['title']}")
            return None
        raise e

def crear_equivalencia(data_equivalencia):
    url = f"{PB_URL}/collections/equivalencias/records"
    try:
        r = requests.post(url, json=data_equivalencia, headers=HEADERS)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        print(f"[x] Error al guardar equivalencia: {data_equivalencia['title']} -> {e.response.text}")
        return None

def buscar_perfumes(texto_busqueda):
    url = f"https://dupesradar.com/wp-content/plugins/ajax-search-for-woocommerce-premium/includes/Engines/TNTSearchMySQL/Endpoints/search.php?s={texto_busqueda}"
    r = requests.get(url)
    r.raise_for_status()
    return r.json()

def extraer_thumbnail_from_html(thumb_html):
    if not thumb_html:
        return None
    soup = BeautifulSoup(thumb_html, "html.parser")
    img = soup.find("img")
    return img.get("src") if img else None

def scrapear_equivalencias(url_perfume):
    if not url_perfume:
        print("[!] URL de perfume inválida")
        return []
    r = requests.get(url_perfume)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    equivalencias = []
    genero = ""
    genero_tag = soup.select_one("#tab-additional_information .woocommerce-product-attributes-item--attribute_pa_genero td")
    if genero_tag:
        genero = genero_tag.get_text(strip=True)

    for card in soup.select("div.theme-card"):
        tienda = card.select_one(".retailer-name span[itemprop='brand']")
        titulo = card.select_one(".retailer-product-name span[itemprop='name']")
        desc = card.select_one("meta[itemprop='description']")
        precio_low = card.select_one("meta[itemprop='lowPrice']")
        precio_high = card.select_one("meta[itemprop='highPrice']")
        enlace = card.select_one(".card-button-container a")

        if not titulo:
            continue

        equivalencias.append({
            "title": titulo.get_text(strip=True),
            "store": tienda.get_text(strip=True) if tienda else "",
            "price": f"{precio_low['content']} € – {precio_high['content']} €" if precio_low and precio_high else "",
            "description": desc["content"] if desc and desc.has_attr("content") else "",
            "gender": genero,
            "buy_link": enlace["href"] if enlace and enlace.has_attr("href") else ""
        })
    return equivalencias

def main():
    for texto_busqueda in BUSQUEDAS_POPULARES:
        print(f"\n[+] Buscando: {texto_busqueda}")
        resultados = buscar_perfumes(texto_busqueda)

        for item in resultados.get("suggestions", []):
            title = item.get("value")
            url_perfume = item.get("url")
            desc = item.get("desc")
            thumb_html = item.get("thumb_html")
            thumbnail_url = extraer_thumbnail_from_html(thumb_html)

            perfume_data = {
                "title": title,
                "description": desc or "",
                "original_link": url_perfume or "",
                "thumbnail": thumbnail_url or ""
            }

            perfume = crear_perfume(perfume_data)
            if not perfume:
                continue

            perfume_id = perfume["id"]
            print(f"  [✓] Guardado perfume: {title}")

            equivalencias = scrapear_equivalencias(url_perfume)
            for eq in equivalencias:
                eq_data = {
                    "perfume_id": perfume_id,
                    "title": eq["title"],
                    "store": eq["store"],
                    "price": eq["price"],
                    "description": eq["description"],
                    "gender": eq["gender"],
                    "buy_link": eq["buy_link"]
                }
                crear_equivalencia(eq_data)
                print(f"    [✓] Equivalencia: {eq['title']}")

if __name__ == "__main__":
    main()
