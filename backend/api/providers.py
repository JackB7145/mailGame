import os, html
import httpx
from typing import Dict, Any, Tuple

class ProviderError(Exception): ...

def render_html(subject: str | None, body_text: str) -> str:
    subj = html.escape(subject or "Letter")
    body = html.escape(body_text).replace("\n", "<br/>")
    return f"<html><body><h3>{subj}</h3><div style='font-family:sans-serif'>{body}</div></body></html>"

async def send_via_lob(to_addr: Dict[str, Any], from_addr: Dict[str, Any], html_body: str) -> str:
    key = os.getenv("LOB_KEY")
    if not key: raise ProviderError("LOB_KEY missing")
    async with httpx.AsyncClient() as client:
      resp = await client.post(
        "https://api.lob.com/v1/letters",
        auth=(key, ""),
        data={  
          "to[name]": to_addr["name"],
          "to[address_line1]": to_addr["line1"],
          "to[address_city]": to_addr["city"],
          "to[address_state]": to_addr["region"],
          "to[address_zip]": to_addr["postal"],
          "to[address_country]": to_addr.get("country","US"),
          "from[name]": from_addr["name"],
          "from[address_line1]": from_addr["line1"],
          "from[address_city]": from_addr["city"],
          "from[address_state]": from_addr["region"],
          "from[address_zip]": from_addr["postal"],
          "from[address_country]": from_addr.get("country","US"),
          "file": html_body,
          "color": "false",
        },
        timeout=30
      )
    if resp.status_code >= 300:
        raise ProviderError(f"Lob error {resp.status_code}: {resp.text}")
    return resp.json()["id"]

async def send_via_postgrid(to_addr: Dict[str, Any], from_addr: Dict[str, Any], html_body: str) -> str:
    key = os.getenv("POSTGRID_KEY")
    if not key: raise ProviderError("POSTGRID_KEY missing")
    async with httpx.AsyncClient() as client:
      resp = await client.post(
        "https://api.postgrid.com/print-mail/v1/letters",
        headers={"x-api-key": key, "content-type": "application/json"},
        json={ "to": to_addr, "from": from_addr, "html": html_body },
        timeout=30
      )
    if resp.status_code >= 300:
        raise ProviderError(f"PostGrid error {resp.status_code}: {resp.text}")
    return resp.json()["id"]

async def send_letter(provider: str, to_addr: Dict[str, Any], from_addr: Dict[str, Any], html_body: str) -> Tuple[str, str]:
    """
    Returns (status, providerRef). status is "SENT" or "FAILED".
    """
    p = provider.upper()
    if p == "MANUAL":
        return ("SENT", "simulated-local")
    try:
        if p == "LOB":
            ref = await send_via_lob(to_addr, from_addr, html_body)
        elif p == "POSTGRID":
            ref = await send_via_postgrid(to_addr, from_addr, html_body)
        else:
            return ("FAILED", "unsupported-provider")
        return ("SENT", ref)
    except ProviderError as e:
        return ("FAILED", str(e))
