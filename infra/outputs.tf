output "name_servers" {
  description = "Pegar estos 4 valores en Hostinger (Servidores de nombres del dominio)."
  value       = aws_route53_zone.main.name_servers
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "github_variables" {
  description = "Variables de repositorio a crear en GitHub (Settings > Secrets and variables > Actions > Variables)."
  value = {
    AWS_ROLE_ARN               = aws_iam_role.github_deploy.arn
    AWS_REGION                 = var.aws_region
    S3_BUCKET                  = aws_s3_bucket.front.bucket
    CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.main.id
  }
}
