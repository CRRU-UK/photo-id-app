resource "cloudflare_dns_record" "dns_cname" {
  zone_id = var.cloudflare_zone_id

  name    = "photoidapp"
  type    = "CNAME"
  content = "crru-uk.github.io"
  ttl     = "1"
  proxied = true
  comment = "Photo ID App docs (GitHub Pages)"
}
