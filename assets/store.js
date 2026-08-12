/* ====================================================================
 * Starzey data layer — localStorage-backed for now.
 *
 * TODO: Replace with Supabase. Every function below maps 1:1 to a
 * table operation:
 *   - links  -> supabase.from("tracking_links")
 *   - leads  -> supabase.from("leads")
 *   - visits -> supabase.rpc("increment_visits") or an insert into a
 *               "visits" events table.
 * ================================================================== */
(function (global) {
  "use strict";

  var LINKS_KEY = "starzey:links";
  var LEADS_KEY = "starzey:leads";

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "link";
  }

  var Store = {

    /* ---------- Tracking links ---------- */

    getLinks: function () {
      return read(LINKS_KEY);
    },

    getLinkBySlug: function (slug) {
      return this.getLinks().find(function (l) { return l.slug === slug; }) || null;
    },

    /* Ensures the slug is unique by appending -2, -3, ... if taken. */
    uniqueSlug: function (base, ignoreId) {
      var links = this.getLinks();
      var slug = slugify(base);
      var candidate = slug;
      var n = 2;
      function taken(s) {
        return links.some(function (l) { return l.slug === s && l.id !== ignoreId; });
      }
      while (taken(candidate)) {
        candidate = slug + "-" + n;
        n += 1;
      }
      return candidate;
    },

    addLink: function (data) {
      var links = this.getLinks();
      var link = {
        id: uid(),
        name: data.name,
        slug: this.uniqueSlug(data.slug || data.name),
        landing: {
          eyebrow: data.landing && data.landing.eyebrow || "",
          headline: data.landing && data.landing.headline || "",
          subtext: data.landing && data.landing.subtext || ""
        },
        visits: 0,
        createdAt: new Date().toISOString()
      };
      links.push(link);
      write(LINKS_KEY, links);
      return link;
    },

    updateLink: function (id, patch) {
      var links = this.getLinks();
      var link = links.find(function (l) { return l.id === id; });
      if (!link) return null;
      if (patch.name !== undefined) link.name = patch.name;
      if (patch.slug !== undefined) link.slug = this.uniqueSlug(patch.slug, id);
      if (patch.landing !== undefined) {
        link.landing.eyebrow = patch.landing.eyebrow || "";
        link.landing.headline = patch.landing.headline || "";
        link.landing.subtext = patch.landing.subtext || "";
      }
      write(LINKS_KEY, links);
      return link;
    },

    deleteLink: function (id) {
      write(LINKS_KEY, this.getLinks().filter(function (l) { return l.id !== id; }));
    },

    recordVisit: function (slug) {
      var links = this.getLinks();
      var link = links.find(function (l) { return l.slug === slug; });
      if (!link) return;
      link.visits = (link.visits || 0) + 1;
      write(LINKS_KEY, links);
    },

    /* Public landing URL for a link (query-param routing so it works
       on any static host; swap for /l/{slug} rewrites in production). */
    linkUrl: function (link) {
      return location.origin + "/?t=" + encodeURIComponent(link.slug);
    },

    /* ---------- Leads ---------- */

    getLeads: function () {
      return read(LEADS_KEY);
    },

    addLead: function (lead) {
      var leads = this.getLeads();
      lead.id = uid();
      leads.push(lead);
      write(LEADS_KEY, leads);
      return lead;
    },

    deleteLead: function (id) {
      write(LEADS_KEY, this.getLeads().filter(function (l) { return l.id !== id; }));
    },

    leadsForSlug: function (slug) {
      return this.getLeads().filter(function (l) { return l.linkSlug === slug; });
    },

    slugify: slugify
  };

  global.StarzeyStore = Store;
})(window);
