import xml from "xml"
import has from "lodash/has"
import pick from "lodash/pick"

const GENERATOR = "Feed for Node.js"
const DOCTYPE = '<?xml version="1.0" encoding="utf-8"?>\n'

class Feed {
  constructor(options) {
    this.options = options
    this.items = []
    this.categories = []
    this.contributors = []
    this.extensions = []
    this.custom_fields = []
  }

  addItem(item) {
    this.items.push(item)
  }

  addCustomField(field_name) {
    this.custom_fields.push(field_name)
  }

  addCategory(category) {
    this.categories.push(category)
  }

  addContributor(contributor) {
    this.contributors.push(contributor)
  }

  addExtension(extension) {
    this.extensions.push(extension)
  }

  render(format) {
    console.warn("DEPRECATED: use atom1() or rss2() instead of render()")
    if (format === "atom-1.0") {
      return this.atom1()
    } else {
      return this.rss2()
    }
  }

  atom1() {
    const { options } = this

    let feed = [
      { _attr: { xmlns: "http://www.w3.org/2005/Atom" } },
      { id: options.id },
      { title: options.title },
      {
        updated: options.updated
          ? this.ISODateString(options.updated)
          : this.ISODateString(new Date())
      },
      { generator: options.generator || GENERATOR }
    ]

    let root = [{ feed }]

    if (options.author) {
      const { name, email, link } = options.author
      let author = []

      if (name) {
        author.push({ name })
      }

      if (email) {
        author.push({ email })
      }

      if (link) {
        author.push({ uri: link })
      }

      feed.push({ author })
    }

    // link (rel="alternate")
    if (options.link) {
      feed.push({ link: { _attr: { rel: "alternate", href: options.link } } })
    }

    // link (rel="self")
    const atomLink =
      options.feed || (options.feedLinks && options.feedLinks.atom)
    if (atomLink) {
      feed.push({ link: { _attr: { rel: "self", href: atomLink } } })
    }

    // link (rel="hub")
    if (options.hub) {
      feed.push({ link: { _attr: { rel: "hub", href: options.hub } } })
    }

    /**************************************************************************
     * "feed" node: optional elements
     *************************************************************************/

    if (options.description) {
      feed.push({ subtitle: options.description })
    }

    if (options.image) {
      feed.push({ logo: options.image })
    }

    if (options.favicon) {
      feed.push({ icon: options.favicon })
    }

    if (options.copyright) {
      feed.push({ rights: options.copyright })
    }

    this.categories.forEach(category => {
      feed.push({ category: [{ _attr: { term: category } }] })
    })

    this.contributors.forEach(_item => {
      const { name, email, link } = _item
      let contributor = []

      if (name) {
        contributor.push({ name })
      }

      if (email) {
        contributor.push({ email })
      }

      if (link) {
        contributor.push({ uri: link })
      }

      feed.push({ contributor })
    })

    // icon

    /**************************************************************************
     * "entry" nodes
     *************************************************************************/
    this.items.forEach(item => {
      //
      // entry: required elements
      //

      let entry = [
        { title: { _attr: { type: "html" }, _cdata: item.title } },
        { id: item.id || item.link },
        { link: [{ _attr: { href: item.link } }] },
        { updated: this.ISODateString(item.date) }
      ]

      //
      // entry: recommended elements
      //
      if (item.description) {
        entry.push({
          summary: { _attr: { type: "html" }, _cdata: item.description }
        })
      }

      if (item.content) {
        entry.push({
          content: { _attr: { type: "html" }, _cdata: item.content }
        })
      }

      // entry author(s)
      if (Array.isArray(item.author)) {
        item.author.forEach(oneAuthor => {
          const { name, email, link } = oneAuthor
          let author = []

          if (name) {
            author.push({ name })
          }

          if (email) {
            author.push({ email })
          }

          if (link) {
            author.push({ uri: link })
          }

          entry.push({ author })
        })
      }

      // content

      // link - relative link to article

      //
      // entry: optional elements
      //

      // category

      // contributor
      if (Array.isArray(item.contributor)) {
        item.contributor.forEach(item => {
          const { name, email, link } = item
          let contributor = []

          if (name) {
            contributor.push({ name })
          }

          if (email) {
            contributor.push({ email })
          }

          if (link) {
            contributor.push({ uri: link })
          }

          entry.push({ contributor })
        })
      }

      // published
      if (item.published) {
        entry.push({ published: this.ISODateString(item.published) })
      }

      // source

      // rights
      if (item.copyright) {
        entry.push({ rights: item.copyright })
      }

      feed.push({ entry: entry })
    })

    return DOCTYPE + xml(root, true)
  }

  rss2() {
    const { options } = this
    let isAtom = false
    let isContent = false

    let channel = [
      { title: options.title },
      { link: options.link },
      { description: options.description },
      {
        lastBuildDate: options.updated
          ? options.updated.toUTCString()
          : new Date().toUTCString()
      },
      { docs: "http://blogs.law.harvard.edu/tech/rss" },
      { generator: options.generator || GENERATOR }
    ]

    let rss = [{ _attr: { version: "2.0" } }, { channel }]

    let root = [{ rss }]

    /**
     * Channel Image
     * http://cyber.law.harvard.edu/rss/rss.html#ltimagegtSubelementOfLtchannelgt
     */
    if (options.image) {
      channel.push({
        image: [
          { title: options.title },
          { url: options.image },
          { link: options.link }
        ]
      })
    }

    /**
     * Channel Copyright
     * http://cyber.law.harvard.edu/rss/rss.html#optionalChannelElements
     */
    if (options.copyright) {
      channel.push({ copyright: options.copyright })
    }

    /**
     * Channel Categories
     * http://cyber.law.harvard.edu/rss/rss.html#comments
     */
    this.categories.forEach(category => {
      channel.push({ category })
    })

    /**
     * Feed URL
     * http://validator.w3.org/feed/docs/warning/MissingAtomSelfLink.html
     */
    const atomLink =
      options.feed || (options.feedLinks && options.feedLinks.atom)
    if (atomLink) {
      isAtom = true

      channel.push({
        "atom:link": {
          _attr: {
            href: atomLink,
            rel: "self",
            type: "application/rss+xml"
          }
        }
      })
    }

    /**
     * Hub for PubSubHubbub
     * https://code.google.com/p/pubsubhubbub/
     */
    if (options.hub) {
      isAtom = true
      channel.push({
        "atom:link": {
          _attr: {
            href: options.hub,
            rel: "hub"
          }
        }
      })
    }

    /**
     * Channel Categories
     * http://cyber.law.harvard.edu/rss/rss.html#hrelementsOfLtitemgt
     */
    this.items.forEach(entry => {
      let item = []

      // Handle custom fields
      this.custom_fields.forEach(field_name => {
        if (entry[field_name]) {
          item.push({ [field_name]: entry[field_name] })
        }
      })

      if (entry.title) {
        item.push({ title: { _cdata: entry.title } })
      }

      if (entry.link) {
        item.push({ link: entry.link })
      }

      if (entry.guid) {
        if (entry.guid.indexOf("http") === -1) {
          item.push({
            guid: { _cdata: entry.guid, _attr: { isPermaLink: "false" } }
          })
        } else {
          item.push({ guid: entry.guid })
        }
      } else if (entry.link) {
        item.push({ guid: entry.link })
      }

      if (entry.date) {
        item.push({ pubDate: entry.date.toUTCString() })
      }

      if (entry.description) {
        item.push({ description: { _cdata: entry.description } })
      }

      if (entry.content) {
        isContent = true
        item.push({ "content:encoded": { _cdata: entry.content } })
      }
      /**
       * Item Author
       * http://cyber.law.harvard.edu/rss/rss.html#ltauthorgtSubelementOfLtitemgt
       */
      if (Array.isArray(entry.author)) {
        entry.author.some(author => {
          if (author.email && author.name) {
            item.push({ author: author.email + " (" + author.name + ")" })
            return true
          } else if (author.name) {
            rss[0]._attr["xmlns:dc"] = "http://purl.org/dc/elements/1.1/"
            item.push({ "dc:creator": author.name })
            return true
          }
          return false
        })
      }

      const mrss = (el, target, isItem = true) => {
        /* categories for the item */
        if (el.categories) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          el.categories.forEach((i, index) => {
            if (!i.value) return
            target.push({
              "media:category": [
                i.value,
                {
                  _attr: {
                    scheme: i.hasOwnProperty("scheme")
                      ? i.scheme
                      : "http://search.yahoo.com/mrss/category_schema",
                    label: i.hasOwnProperty("label") ? i.label : null
                  }
                }
              ]
            })
          })
        }

        /* community statistics and averaged input */
        if (el.community) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          let communitygroup = []

          if (has(el.community, "statistics")) {
            const i = el.community.statistics
            communitygroup.push({
              "media:statistics": [{ _attr: pick(i, ["views", "favorites"]) }]
            })
          }
          if (has(el.community, "starRating")) {
            const i = el.community.starRating
            communitygroup.push({
              "media:starRating": [
                { _attr: pick(i, ["average", "count", "min", "max"]) }
              ]
            })
          }

          if (communitygroup.length > 0)
            target.push({ "media:community": communitygroup })
        }

        /* embed if the el has it */
        if (el.embed) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          target.push({
            "media:embed": [
              {
                _attr: pick(el.embed, [
                  "url",
                  "width",
                  "height",
                  "type",
                  "allowFullScreen"
                ])
              }
            ]
          })
        }

        if (el.keywords) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          target.push({ "media:keywords": [el.keywords.join(", ")] })
        }

        if (el.subTitle) {
          el.subTitle.forEach((i, index) => {
            if (!has(i, "href") || !has(i, "type" || !has(i, "lang"))) return

            rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
            target.push({
              "media:subTitle": [
                {
                  _attr: pick(i, ["href", "type", "lang"])
                }
              ]
            })
          })
        }

        /* player if the el has it */
        if (el.player) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          target.push({
            "media:player": [
              {
                _attr: pick(el.player, ["url", "width", "height"])
              }
            ]
          })
        }

        if (isItem && el.enclosures) {
          target.push({
            enclosure: el.enclosures.map(({ length, type, url }) => ({
              _attr: {
                length,
                type,
                url
              }
            }))
          })
        }

        /**
         * Feed supports *one* MRSS media:group
         */
        let mediagroup = []

        if (isItem && el.peerLinks) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"

          el.peerLinks.forEach(({ href, type }, index) =>
            mediagroup.push({
              "media:peerLink": [{
                _attr: {
                  href,
                  isDefault: index === 0,
                  type
                }
              }]
            })
          );
        }

        /**
         * rss feed only supports 1 enclosure per el, so switching to
         * MRSS and its support for multiple enclosures is the next step.
         */
        if (el.torrent && isItem) {
          let metainfo = el.torrent
          if (!Array.isArray(metainfo)) metainfo = [metainfo]

          metainfo.forEach((i, index) => {
            let i_metainfo = i
            if (!(i instanceof Object)) i_metainfo = { url: i }

            if (index == 0) {
              target.push({
                enclosure: [
                  {
                    _attr: {
                      type: "application/x-bittorrent",
                      url: i_metainfo.url
                    }
                  }
                ]
              })
              if ("size_in_bytes" in i_metainfo) {
                target[target.length - 1].enclosure[0]._attr["length"] =
                  i_metainfo.size_in_bytes
              }
            } else {
              if (index == 1) {
                rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
                let previous_metainfo = !(metainfo[0] instanceof Object)
                  ? { url: metainfo[0] }
                  : metainfo[0]
                mediagroup.push({
                  "media:peerLink": [
                    {
                      _attr: {
                        type: "application/x-bittorrent",
                        href: previous_metainfo.url,
                        isDefault: "true"
                      }
                    }
                  ]
                })
              }
              mediagroup.push({
                "media:peerLink": [
                  {
                    _attr: {
                      type: "application/x-bittorrent",
                      href: i_metainfo.url
                    }
                  }
                ]
              })
            }
          })
        }

        if (el.videos && isItem) {
          el.videos.forEach(v => {
            const videoParse = () => {
              let content = [
                {
                  _attr: pick(v, [
                    "url",
                    "fileSize",
                    "type",
                    "medium",
                    "expression",
                    "bitrate",
                    "framerate",
                    "samplingrate",
                    "channels",
                    "duration",
                    "height",
                    "width",
                    "lang"
                  ])
                }
              ]
              const algo = ["md5", "sha-1"]
              algo.map(algo =>
                has(v, algo)
                  ? content.push({
                      "media:hash": [{ _attr: { algo } }, v[algo]]
                    })
                  : ""
              )
              mrss(v, content, (isItem = false))
              return content
            }
            mediagroup.push({
              "media:content": videoParse()
            })
          })
        }

        if (mediagroup.length > 0) {
          /* make redundant information for MRSS clients that only look for the media:group and its contents */
          // mrss(entry, mediagroup, isItem = false) // isItem MUST be false, to prevent infinite recursion

          target.push({ "media:group": mediagroup })
        } else if (el.image) {
          target.push({
            enclosure: [
              {
                _attr: {
                  length: el.image.length,
                  type: el.image.type,
                  url: el.image.url
                }
              }
            ]
          })
        }

        if (el.thumbnail) {
          rss[0]._attr["xmlns:media"] = "http://search.yahoo.com/mrss/"
          let thumbnail = el.thumbnail
          if (!Array.isArray(thumbnail)) thumbnail = [thumbnail]

          thumbnail.forEach((i, index) => {
            let i_thumbnail = i
            if (!(i instanceof Object)) i_thumbnail = { url: i }

            target.push({
              "media:thumbnail": [{ _attr: { url: i_thumbnail.url } }]
            })
            ;["height", "width", "time"].forEach(optional_attr => {
              if (optional_attr in i_thumbnail)
                target[target.length - 1]["media:thumbnail"][0]._attr[
                  optional_attr
                ] = i_thumbnail[optional_attr]
            })
          })
        }

        /* el properties which make sense in a setting where MRSS attributes are already present */
        if (el.title && has(rss[0]._attr, "xmlns:media")) {
          target.push({
            "media:title": [el.title, { _attr: { type: "plain" } }]
          })
        }
        if (el.description && has(rss[0]._attr, "xmlns:media")) {
          target.push({
            "media:description": [el.description, { _attr: { type: "plain" } }]
          })
        }
      }

      mrss(entry, item)

      if (has(rss[0]._attr, "xmlns:media"))
        item.push({ "media:rating": [item.nsfw ? "adult" : "nonadult"] })

      channel.push({ item })
    })

    if (isContent) {
      rss[0]._attr["xmlns:content"] = "http://purl.org/rss/1.0/modules/content/"
    }

    if (isAtom) {
      rss[0]._attr["xmlns:atom"] = "http://www.w3.org/2005/Atom"
    }

    /**
     * Sort properties to provide reproducible results for strict implementations
     */
    function sortObject(o) {
      return Object.keys(o)
        .sort()
        .reduce((r, k) => ((r[k] = o[k]), r), {})
    }
    if (rss[0]._attr) rss[0]._attr = sortObject(rss[0]._attr)

    return DOCTYPE + xml(root, true)
  }

  json1() {
    const { options, items, extensions } = this
    let feed = {
      version: "https://jsonfeed.org/version/1",
      title: options.title
    }

    if (options.link) {
      feed.home_page_url = options.link
    }

    if (options.feedLinks && options.feedLinks.json) {
      feed.feed_url = options.feedLinks.json
    }

    if (options.description) {
      feed.description = options.description
    }

    if (options.image) {
      feed.icon = options.image
    }

    if (options.author) {
      feed.author = {}
      if (options.author.name) {
        feed.author.name = options.author.name
      }
      if (options.author.link) {
        feed.author.url = options.author.link
      }
    }

    extensions.forEach(e => {
      feed[e.name] = e.objects
    })

    feed.items = items.map(item => {
      let feedItem = {
        id: item.id,
        // json_feed distinguishes between html and text content
        // but since we only take a single type, we'll assume HTML
        html_content: item.content
      }
      if (item.link) {
        feedItem.url = item.link
      }
      if (item.title) {
        feedItem.title = item.title
      }
      if (item.description) {
        feedItem.summary = item.description
      }

      if (item.torrent) {
        let metainfo = item.torrent
        if (!Array.isArray(metainfo)) metainfo = [metainfo]
        if (!feedItem.attachments) feedItem.attachments = []

        metainfo.forEach(i => {
          let i_metainfo = i
          if (!(i instanceof Object)) i_metainfo = { url: i }
          feedItem.attachments.push({
            ...i_metainfo,
            mime_type: "application/x-bittorrent"
          })
        })
      }

      if (item.image) {
        feedItem.image = item.image
      }

      if (item.date) {
        feedItem.date_modified = this.ISODateString(item.date)
      }
      if (item.published) {
        feedItem.date_published = this.ISODateString(item.published)
      }

      if (item.author) {
        let author = item.author
        if (author instanceof Array) {
          // json feed only supports 1 author per post
          author = author[0]
        }
        feedItem.author = {}
        if (author.name) {
          feedItem.author.name = author.name
        }
        if (author.link) {
          feedItem.author.url = author.link
        }
      }

      if (item.extensions) {
        item.extensions.forEach(e => {
          feedItem[e.name] = e.objects
        })
      }

      return feedItem
    })

    return JSON.stringify(feed, null, 4)
  }

  ISODateString(d) {
    function pad(n) {
      return n < 10 ? "0" + n : n
    }

    return (
      d.getUTCFullYear() +
      "-" +
      pad(d.getUTCMonth() + 1) +
      "-" +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      ":" +
      pad(d.getUTCMinutes()) +
      ":" +
      pad(d.getUTCSeconds()) +
      "Z"
    )
  }
}

module.exports = Feed
