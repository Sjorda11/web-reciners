#!/usr/bin/env python3
"""Genera les pàgines del web de Reciners en català, castellà i anglès.

Ús:  python3 src/build.py   (des de la carpeta del web)

Llegeix src/plantilla.html, src/legal.html, src/legal-XX.html, src/peu.html i
src/sprite.html i escriu index.html, legal.html, es/..., en/..., sitemap.xml.
Els textos en castellà i anglès són als atributs data-es i data-en de cada
element; la traducció es "cou" amb Chrome perquè el codi resultant sigui net.
"""
import asyncio, json, os, urllib.parse
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SITE = 'https://reciners.com/'
LANGS = ['ca', 'es', 'en']
DIR = {'ca': '', 'es': 'es/', 'en': 'en/'}
OGL = {'ca': 'ca_ES', 'es': 'es_ES', 'en': 'en_GB'}
TITLE = {
    'ca': "Reciners Informàtica · Botiga i taller d'informàtica a Banyoles",
    'es': 'Reciners Informática · Tienda y taller de informática en Banyoles',
    'en': 'Reciners Informàtica · Computer shop and repair in Banyoles',
}
DESC = {
    'ca': "Venda, reparació, instal·lació i manteniment d'equips informàtics a Banyoles per a particulars, empreses i gamers. Taller propi, servei a domicili i assistència remota.",
    'es': 'Venta, reparación, instalación y mantenimiento de equipos informáticos en Banyoles para particulares, empresas y gamers. Taller propio, servicio a domicilio y asistencia remota.',
    'en': 'Sales, repair, installation and maintenance of computer equipment in Banyoles for homes, businesses and gamers. Own workshop, on-site service and remote support.',
}
LTITLE = {'ca': 'Informació legal · Reciners Informàtica', 'es': 'Información legal · Reciners Informática', 'en': 'Legal information · Reciners Informàtica'}
LDESC = {
    'ca': 'Avís legal, política de privacitat i política de cookies de Reciners Informatica, S.L.',
    'es': 'Aviso legal, política de privacidad y política de cookies de Reciners Informatica, S.L.',
    'en': 'Legal notice, privacy policy and cookie policy of Reciners Informatica, S.L.',
}
WA_TXT = {
    'ca': "Hola! Us escric des del web de Reciners. Voldria fer una consulta:",
    'es': '¡Hola! Os escribo desde la web de Reciners. Quería hacer una consulta:',
    'en': "Hi! I'm writing from the Reciners website. I have a question:",
}
NAMES = {'ca': 'Català', 'es': 'Castellano', 'en': 'English'}


def read(n):
    with open(os.path.join(SRC, n), encoding='utf-8') as f:
        return f.read()


def rel(frm, to, page):
    """Enllaç relatiu de la carpeta de l'idioma 'frm' a la pàgina de l'idioma 'to'."""
    up = '../' if DIR[frm] else ''
    path = up + DIR[to] + page
    return path or './'


def jsonld(lang):
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    d = {
        '@context': 'https://schema.org', '@type': 'ComputerStore', '@id': SITE + '#botiga',
        'name': 'Reciners Informàtica', 'legalName': 'RECINERS INFORMATICA, S.L.', 'taxID': 'B55174858',
        'url': SITE + DIR[lang], 'image': SITE + 'img/botiga-facana.jpg', 'logo': SITE + 'img/favicon.svg',
        'description': DESC[lang], 'telephone': '+34972576055', 'email': 'admin@reciners.com', 'foundingDate': '2013-06-28',
        'address': {'@type': 'PostalAddress', 'streetAddress': 'Av. dels Països Catalans, 207', 'addressLocality': 'Banyoles',
                    'postalCode': '17820', 'addressRegion': 'Girona', 'addressCountry': 'ES'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': 42.11367041, 'longitude': 2.77144541},
        'hasMap': 'https://www.google.com/maps/search/?api=1&query=42.11367041%2C2.77144541',
        'openingHoursSpecification': [
            {'@type': 'OpeningHoursSpecification', 'dayOfWeek': days, 'opens': '09:30', 'closes': '13:00'},
            {'@type': 'OpeningHoursSpecification', 'dayOfWeek': days, 'opens': '15:30', 'closes': '20:00'}],
        'areaServed': {'@type': 'City', 'name': 'Banyoles'},
        'contactPoint': [{'@type': 'ContactPoint', 'telephone': '+34639018299', 'contactType': 'customer service',
                          'availableLanguage': ['ca', 'es', 'en']}],
    }
    return json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def fill(tpl, lang, page, title, desc, body=''):
    b = '../' if DIR[lang] else ''
    alts = '\n'.join(f'<link rel="alternate" hreflang="{l}" href="{SITE}{DIR[l]}{page}">' for l in LANGS)
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{SITE}{page}">'
    sw = ''.join(f'<a href="{rel(lang, l, page)}" hreflang="{l}" lang="{l}" title="{NAMES[l]}"' + (' aria-current="true"' if l == lang else '') + f'>{l.upper()}</a>' for l in LANGS)
    wa = 'https://wa.me/34639018299?text=' + urllib.parse.quote(WA_TXT[lang])
    footer = read('peu.html').replace('{{H}}', '' if page == '' else './')
    out = tpl
    for k, v in {'{{FOOTER}}': footer, '{{SPRITE}}': read('sprite.html'), '{{BODY}}': body, '{{LANG}}': lang,
                 '{{TITLE}}': title, '{{DESC}}': desc, '{{CANON}}': SITE + DIR[lang] + page, '{{ALTS}}': alts,
                 '{{OGL}}': OGL[lang], '{{B}}': b, '{{LANGSW}}': sw, '{{WA}}': wa.replace('&', '&amp;'),
                 '{{JSONLD}}': jsonld(lang)}.items():
        out = out.replace(k, v)
    assert '{{' not in out, [l for l in out.splitlines() if '{{' in l][:3]
    return out


BAKE = r"""(l) => {
  const cap = s => s[0].toUpperCase() + s.slice(1);
  document.querySelectorAll('[data-es],[data-en]').forEach(el => {
    el.dataset.ca = el.innerHTML; const v = el.dataset[l]; if (v !== undefined) el.innerHTML = v; });
  document.querySelectorAll('[data-alt-es],[data-alt-en]').forEach(el => {
    el.dataset.altCa = el.alt; const v = el.dataset['alt' + cap(l)]; if (v !== undefined) el.alt = v; });
  document.querySelectorAll('[data-aria-es],[data-aria-en]').forEach(el => {
    el.dataset.ariaCa = el.getAttribute('aria-label') || ''; const v = el.dataset['aria' + cap(l)]; if (v !== undefined) el.setAttribute('aria-label', v); });
  document.querySelectorAll('[data-l-ca]').forEach(a => { a.textContent = a.dataset['l' + cap(l)]; });
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML + '\n';
}"""


async def main():
    pages = []
    for l in LANGS:
        pages.append((l, DIR[l] + 'index.html', fill(read('plantilla.html'), l, '', TITLE[l], DESC[l])))
        pages.append((l, DIR[l] + 'legal.html', fill(read('legal.html'), l, 'legal.html', LTITLE[l], LDESC[l], read(f'legal-{l}.html'))))
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await br.new_page()
        await pg.route('**/*', lambda r: r.abort())
        for l, path, html in pages:
            if l != 'ca':
                await pg.set_content(html, wait_until='domcontentloaded')
                html = await pg.evaluate(BAKE, l)
            dst = os.path.join(ROOT, path)
            os.makedirs(os.path.dirname(dst) or ROOT, exist_ok=True)
            with open(dst, 'w', encoding='utf-8') as f:
                f.write(html)
            print('escrit', path, len(html))
        await br.close()
    urls = []
    for page in ['', 'legal.html']:
        for l in LANGS:
            alt = ''.join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{SITE}{DIR[x]}{page}"/>' for x in LANGS)
            urls.append(f'<url><loc>{SITE}{DIR[l]}{page}</loc>{alt}<changefreq>monthly</changefreq><priority>{"1.0" if not page else "0.3"}</priority></url>')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
    print('escrit sitemap.xml')

asyncio.run(main())
