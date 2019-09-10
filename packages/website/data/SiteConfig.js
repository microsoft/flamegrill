module.exports = {
  blogPostDir: 'posts', // The name of directory that contains your posts.
  docDir: 'docs', // The name of the directory that contains lessons or docs.
  siteTitle: 'Flamegrill', // Site title.
  siteTitleAlt: 'flame grill your webpages for easy digestion', // Alternative site title for SEO.
  siteLogo: '/logos/logo-1024.png', // Logo used for SEO and manifest.
  siteUrl: 'https://microsoft.github.io', // Domain of your website without pathPrefix.
  pathPrefix: '/flamegrill', // Prefixes all links.
  siteDescription: 'flame grill your webpages for easy digestion', // Website description used for RSS feeds/meta description tag.
  siteRss: '/rss.xml', // Path to the RSS file.
  postDefaultCategoryID: 'Tech', // Default category for posts.

  // Links to social profiles/projects you want to display in the author segment/navigation bar.
  repoLink: 'https://github.com/microsoft/flamegrill',
  copyright: `Copyright © ${new Date().getFullYear()} Microsoft`, // Copyright string for the footer of the website and RSS feed.
  themeColor: '#fb3e44', // Used for setting manifest and progress theme colors.
  backgroundColor: '#e0e0e0', // Used for setting manifest background color.
  // TODO: Move this literally anywhere better.
  toCChapters: ['', 'Chapter 1', 'Chapter 2'] // Used to generate the Table Of Contents. Index 0 should be blank.
};
