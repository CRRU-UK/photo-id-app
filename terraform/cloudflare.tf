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

# Rewrite for GitHub Pages to prevent redirect loops with Cloudflare SSL config
resource "cloudflare_ruleset" "docs_https_redirect" {
  zone_id = var.cloudflare_zone_id

  name        = "Disable HTTPS enforcement for documentation"
  description = "Skip Cloudflare enforcement to avoid redirect loop with GitHub Pages"
  kind        = "zone"
  phase       = "http_config_settings"

  rules = [{
    enabled = true

    expression  = "(http.host eq \"${local.docs_subdomain}.crru.org.uk\")"
    description = "Disable Automatic HTTPS Rewrites for GitHub Pages subdomain"

    action = "set_config"
    action_parameters = {
      automatic_https_rewrites = false
    }
  }]
}
