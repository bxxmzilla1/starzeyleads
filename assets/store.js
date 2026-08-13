/* ====================================================================
 * Starzey data layer — Supabase-backed.
 *
 * Requires (loaded before this file):
 *   1. /assets/config.js                (window.STARZEY_CONFIG)
 *   2. @supabase/supabase-js v2 via CDN (window.supabase)
 *
 * All data methods return Promises. Tables live in supabase/schema.sql:
 *   - tracking_links (public read, authenticated write)
 *   - leads          (public insert, authenticated read/delete)
 *   - increment_visits() RPC for anonymous visit counting
 * ================================================================== */
(function (global) {
  "use strict";

  var cfg = global.STARZEY_CONFIG || {};
  var configured = !!(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 &&
    cfg.SUPABASE_ANON_KEY !== "YOUR-ANON-KEY"
  );

  var client = configured && global.supabase
    ? global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "link";
  }

  function mapLink(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      landing: {
        eyebrow: row.eyebrow || "",
        headline: row.headline || "",
        subtext: row.subtext || "",
        bullets: row.bullets || ""
      },
      visits: row.visits || 0,
      createdAt: row.created_at
    };
  }

  function mapLead(row) {
    if (!row) return null;
    return {
      id: row.id,
      linkSlug: row.link_slug,
      address: row.address,
      timeline: row.timeline,
      agent: row.agent,
      reason: row.reason,
      condition: row.condition,
      occupancy: row.occupancy,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      phoneValid: row.phone_valid,
      country: row.country,
      city: row.city,
      ip: row.ip,
      createdAt: row.created_at
    };
  }

  function unwrap(res) {
    if (res.error) {
      console.error("Starzey/Supabase:", res.error.message || res.error);
      throw res.error;
    }
    return res.data;
  }

  function notConfigured() {
    return Promise.reject(new Error(
      "Supabase is not configured — fill in assets/config.js"
    ));
  }

  var Store = {

    isConfigured: function () { return configured; },
    client: client,

    /* ---------- Auth ---------- */

    getSession: function () {
      if (!configured) return Promise.resolve(null);
      return client.auth.getSession().then(function (res) {
        return res.data.session || null;
      });
    },

    /* Redirects to the login page when there is no session.
       Returns a never-resolving promise on redirect so page init
       code simply doesn't run. */
    requireAuth: function () {
      if (!configured) {
        location.href = "/admin/login/";
        return new Promise(function () {});
      }
      return this.getSession().then(function (session) {
        if (!session) {
          location.href = "/admin/login/";
          return new Promise(function () {});
        }
        return session;
      });
    },

    signIn: function (email, password) {
      if (!configured) return notConfigured();
      return client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data;
        });
    },

    signUp: function (email, password) {
      if (!configured) return notConfigured();
      return client.auth.signUp({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data;
        });
    },

    signOut: function () {
      if (!configured) return Promise.resolve();
      return client.auth.signOut().then(function () {
        location.href = "/admin/login/";
      });
    },

    /* ---------- Tracking links ---------- */

    getLinks: function () {
      if (!configured) return Promise.resolve([]);
      return client.from("tracking_links")
        .select("*")
        .order("created_at", { ascending: true })
        .then(function (res) { return unwrap(res).map(mapLink); });
    },

    getLinkBySlug: function (slug) {
      if (!configured) return Promise.resolve(null);
      return client.from("tracking_links")
        .select("*")
        .eq("slug", slug)
        .maybeSingle()
        .then(function (res) { return mapLink(unwrap(res)); });
    },

    /* Ensures the slug is unique by appending -2, -3, ... if taken. */
    uniqueSlug: function (base, ignoreId) {
      if (!configured) return notConfigured();
      var slug = slugify(base);
      return client.from("tracking_links")
        .select("id, slug")
        .then(function (res) {
          var links = unwrap(res);
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
        });
    },

    addLink: function (data) {
      if (!configured) return notConfigured();
      return this.uniqueSlug(data.slug || data.name).then(function (slug) {
        return client.from("tracking_links").insert({
          name: data.name,
          slug: slug,
          eyebrow: data.landing && data.landing.eyebrow || "",
          headline: data.landing && data.landing.headline || "",
          subtext: data.landing && data.landing.subtext || "",
          bullets: data.landing && data.landing.bullets || ""
        }).select().single();
      }).then(function (res) { return mapLink(unwrap(res)); });
    },

    updateLink: function (id, patch) {
      if (!configured) return notConfigured();
      return this.uniqueSlug(patch.slug || patch.name, id).then(function (slug) {
        var update = { name: patch.name, slug: slug };
        /* Landing copy is only touched when explicitly provided, so
           renames don't wipe existing customization. */
        if (patch.landing) {
          update.eyebrow = patch.landing.eyebrow || "";
          update.headline = patch.landing.headline || "";
          update.subtext = patch.landing.subtext || "";
          update.bullets = patch.landing.bullets || "";
        }
        return client.from("tracking_links").update(update)
          .eq("id", id).select().single();
      }).then(function (res) { return mapLink(unwrap(res)); });
    },

    deleteLink: function (id) {
      if (!configured) return notConfigured();
      return client.from("tracking_links").delete().eq("id", id)
        .then(function (res) { return unwrap(res); });
    },

    /* Resets a link's stats: visit counter, visit dedupe rows, and
       funnel/session history. Leads are never touched. The three
       cleanups run independently so one failure can't block the rest. */
    resetLinkStats: function (id, slug) {
      if (!configured) return notConfigured();
      return Promise.all([
        client.from("tracking_links").update({ visits: 0 }).eq("id", id),
        client.from("funnel_events").delete().eq("link_slug", slug),
        client.from("link_visits").delete().eq("link_slug", slug)
      ]).then(function (results) {
        results.forEach(function (res) { unwrap(res); });
      });
    },

    /* Resets the stats of every tracking link at once. Leads are
       never touched. */
    resetAllLinkStats: function () {
      if (!configured) return notConfigured();
      return Promise.all([
        client.from("tracking_links").update({ visits: 0 }).gte("visits", 0),
        client.from("funnel_events").delete().neq("session_id", ""),
        client.from("link_visits").delete().neq("visitor_key", "")
      ]).then(function (results) {
        results.forEach(function (res) { unwrap(res); });
      });
    },

    /* Fire-and-forget visit counter (anonymous visitors). Each
       visitorKey (IP, or device id fallback) counts once per link. */
    recordVisit: function (slug, visitorKey) {
      if (!configured) return Promise.resolve();
      return client.rpc("increment_visits", { p_slug: slug, p_key: visitorKey })
        .then(function (res) {
          if (res.error) console.error("Starzey/Supabase:", res.error.message);
        });
    },

    /* Public landing URL for a link (query-param routing so it works
       on any static host; swap for /l/{slug} rewrites if desired). */
    linkUrl: function (link) {
      return location.origin + "/?t=" + encodeURIComponent(link.slug);
    },

    /* ---------- Leads ---------- */

    /* Only leads whose phone number passed the Twilio Lookup check
       are ever shown in the admin. */
    getLeads: function () {
      if (!configured) return Promise.resolve([]);
      return client.from("leads")
        .select("*")
        .eq("phone_valid", true)
        .order("created_at", { ascending: true })
        .then(function (res) { return unwrap(res).map(mapLead); });
    },

    addLead: function (lead) {
      if (!configured) return notConfigured();
      return client.from("leads").insert({
        link_slug: lead.linkSlug,
        address: lead.address,
        timeline: lead.timeline,
        agent: lead.agent,
        reason: lead.reason,
        condition: lead.condition,
        occupancy: lead.occupancy,
        full_name: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        phone_valid: !!lead.phoneValid,
        country: lead.country || null,
        city: lead.city || null,
        ip: lead.ip || null
      }).then(function (res) { return unwrap(res); });
    },

    deleteLead: function (id) {
      if (!configured) return notConfigured();
      return client.from("leads").delete().eq("id", id)
        .then(function (res) { return unwrap(res); });
    },

    /* ---------- Global landing page settings ---------- */

    getLandingSettings: function () {
      var defaults = { eyebrow: "", headline: "", subtext: "", bullets: "" };
      if (!configured) return Promise.resolve(defaults);
      return client.from("landing_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
        .then(function (res) {
          var row = unwrap(res);
          if (!row) return defaults;
          return {
            eyebrow: row.eyebrow || "",
            headline: row.headline || "",
            subtext: row.subtext || "",
            bullets: row.bullets || ""
          };
        });
    },

    saveLandingSettings: function (settings) {
      if (!configured) return notConfigured();
      return client.from("landing_settings").upsert({
        id: 1,
        eyebrow: settings.eyebrow || "",
        headline: settings.headline || "",
        subtext: settings.subtext || "",
        bullets: settings.bullets || "",
        updated_at: new Date().toISOString()
      }).then(function (res) { return unwrap(res); });
    },

    /* ---------- Funnel progress events ---------- */

    /* Fire-and-forget: one row per step a visitor completes. */
    recordFunnelEvent: function (evt) {
      if (!configured) return Promise.resolve();
      return client.from("funnel_events").insert({
        session_id: evt.sessionId,
        link_slug: evt.linkSlug,
        step_index: evt.stepIndex,
        step: evt.step,
        value: evt.value || null
      }).then(function (res) {
        if (res.error) console.error("Starzey/Supabase:", res.error.message);
      });
    },

    getFunnelEvents: function (slug) {
      if (!configured) return Promise.resolve([]);
      return client.from("funnel_events")
        .select("*")
        .eq("link_slug", slug)
        .order("created_at", { ascending: true })
        .then(function (res) {
          return unwrap(res).map(function (row) {
            return {
              id: row.id,
              sessionId: row.session_id,
              linkSlug: row.link_slug,
              stepIndex: row.step_index,
              step: row.step,
              value: row.value,
              createdAt: row.created_at
            };
          });
        });
    },

    slugify: slugify
  };

  global.StarzeyStore = Store;
})(window);
