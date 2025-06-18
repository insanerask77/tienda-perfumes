import requests
from bs4 import BeautifulSoup

PB_URL = "http://localhost:8080/api"
HEADERS = {
    "Content-Type": "application/json"
}

def crear_perfume(data_perfume):
    url = f"{PB_URL}/collections/perfumes/records"
    r = requests.post(url, json=data_perfume, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def crear_equivalencia(data_equivalencia):
    url = f"{PB_URL}/collections/equivalencias/records"
    r = requests.post(url, json=data_equivalencia, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def buscar_perfumes(texto_busqueda):
    # Buscar perfumes cuyo título contenga texto_busqueda (case insensitive)
    url = f"{PB_URL}/collections/perfumes/records"
    filter_query = f'title~"{texto_busqueda}"'  # búsqueda fuzzy simple
    params = {
        "filter": filter_query,
        "perPage": 50
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()

def buscar_equivalencias_por_perfumes(ids_perfumes):
    # Buscar equivalencias donde perfume_id esté en ids_perfumes
    if not ids_perfumes:
        return []

    # Construimos el filtro OR para PocketBase
    filtro = "||".join([f'perfume_id="{pid}"' for pid in ids_perfumes])

    url = f"{PB_URL}/collections/equivalencias/records"
    params = {
        "filter": filtro,
        "perPage": 100
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()

def extraer_thumbnail_from_html(thumb_html):
    if not thumb_html:
        return None
    soup = BeautifulSoup(thumb_html, "html.parser")
    img = soup.find("img")
    if img:
        return img.get("src")
    return None

def scrapear_equivalencias(url_perfume, genero_general):
    r = requests.get(url_perfume)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    equivalencias = []

    for card in soup.select("div.theme-card"):
        brand_tag = card.select_one(".retailer-name span[itemprop='brand']")
        tienda = brand_tag.get_text(strip=True) if brand_tag else ""

        nombre_tag = card.select_one(".retailer-product-name span[itemprop='name']")
        titulo = nombre_tag.get_text(strip=True) if nombre_tag else ""

        desc_tag = card.select_one("meta[itemprop='description']")
        descripcion = desc_tag["content"] if desc_tag and desc_tag.has_attr("content") else ""

        precio_bajo = card.select_one("meta[itemprop='lowPrice']")
        precio_alto = card.select_one("meta[itemprop='highPrice']")
        precio = ""
        if precio_bajo and precio_alto:
            precio = f"{precio_bajo['content']} € – {precio_alto['content']} €"

        enlace_tag = card.select_one(".card-button-container a")
        enlace_compra = enlace_tag["href"] if enlace_tag and enlace_tag.has_attr("href") else ""

        equivalencias.append({
            "title": titulo,
            "store": tienda,
            "price": precio,
            "description": descripcion,
            "gender": genero_general,
            "buy_link": enlace_compra
        })

    return equivalencias

def main():
    lista_perfumes = [
        "Le Male Elixir", "Ch Men", "Dior Sauvage", "Bleu de Chanel",
        # ... añade aquí los 100 perfumes o marcas más famosas
    ]

    for texto_busqueda in lista_perfumes:
        print(f"Buscando perfumes que coincidan con '{texto_busqueda}'...")
        perfumes_res = buscar_perfumes(texto_busqueda)
        perfumes = perfumes_res.get("items", [])

        if not perfumes:
            print(f"No se encontraron perfumes para '{texto_busqueda}'.")
            continue

        # Guardamos perfumes y sacamos sus IDs
        perfume_ids = []
        for p in perfumes:
            # Si ya existe en la base, podemos saltar o actualizar (esto puedes mejorar)
            perfume_ids.append(p["id"])

        # Ahora buscamos equivalencias relacionadas con esos perfumes
        equivalencias_res = buscar_equivalencias_por_perfumes(perfume_ids)
        equivalencias = equivalencias_res.get("items", [])

        if not equivalencias:
            print(f"No se encontraron equivalencias para perfumes relacionados con '{texto_busqueda}'.")
            continue

        for eq in equivalencias:
            print(f"Equivalencia: {eq['title']} | Tienda: {eq['store']} | Precio: {eq['price']}")

if __name__ == "__main__":
    main()
