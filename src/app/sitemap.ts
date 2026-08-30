import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.sefukoc.com' // Kendi domain adresiniz

  // Projenizde yer alan ana sayfalar
  const routes = [
    '',
    // Projenizdeki diğer sayfalar (örneğin: koçluk, program, giriş vb.)
    // '/giris',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...routes]
}