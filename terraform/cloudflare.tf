locals {
  docs_subdomain = "photoidapp" // photoidapp.crru.org.uk
}

resource "cloudflare_dns_record" "dns_cname" {
  zone_id = var.cloudflare_zone_id

  name    = local.docs_subdomain
  type    = "CNAME"
  content = "crru-uk.github.io"
  ttl     = "1"
  proxied = true
  comment = "Photo ID App docs (GitHub Pages)"
}

# Override SSL to 'Full' for GitHub Pages to prevent redirect loops with zone-wide Flexible SSL
resource "cloudflare_ruleset" "docs_ssl" {
  zone_id = var.cloudflare_zone_id

  name        = "SSL override for documentation"
  description = "Use Full SSL for GitHub Pages subdomain to avoid redirect loop with Flexible SSL"
  kind        = "zone"
  phase       = "http_config_settings"

  rules = [{
    enabled = true

    expression  = "(http.host eq \"${local.docs_subdomain}.crru.org.uk\")"
    description = "Full SSL for GitHub Pages subdomain"

    action = "set_config"
    action_parameters = {
      ssl = "full"
    }
  }]
}
