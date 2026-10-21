/**
 * ideas-tab.js - Curated ideas gallery with favoriting and thematic filtering
 *
 * Cards with celebratory gradient accent, icon, title, "why it fits you",
 * and interactive save (heart) toggle.
 */

import { el, icon } from "../dom.js";

const SECTION_ICONS = {
  decor: "sparkles",
  entertainment: "music",
  catering: "utensils",
  attire: "heart",
  rituals: "sparkles",
  keepsake: "camera",
  general: "sparkles"
};

function createIdeasHeaderCard({
  sections,
  favoriteCount,
  showFavoritesOnly,
  activeSectionFilter,
  onToggleFavorites,
  onSelectSection
}) {
  return el("div", { className: "card ideas-header-card" }, [
    el("div", { className: "ideas-header-headline" }, [
      el("div", {}, [
        el("h2", { className: "tab-view-heading" }, "Curated Celebration Concepts"),
        el(
          "p",
          { className: "text-muted" },
          "Bespoke creative themes, ritual adaptations, and guest entertainment tailored to your celebration."
        )
      ]),
      el(
        "button",
        {
          type: "button",
          className: `btn-filter-favorites ${showFavoritesOnly ? "is-active" : ""}`,
          "aria-pressed": showFavoritesOnly ? "true" : "false",
          onClick: onToggleFavorites
        },
        [icon(showFavoritesOnly ? "heartFilled" : "heart"), `Favorites (${favoriteCount})`]
      )
    ]),
    el(
      "div",
      { className: "ideas-sections-bar", role: "group", "aria-label": "Filter ideas by domain" },
      [
        el(
          "button",
          {
            type: "button",
            className: `filter-chip ${activeSectionFilter === "all" ? "is-active" : ""}`,
            onClick: () => onSelectSection("all")
          },
          "All Domains"
        ),
        ...sections.map((sec) =>
          el(
            "button",
            {
              type: "button",
              className: `filter-chip ${activeSectionFilter === sec ? "is-active" : ""}`,
              onClick: () => onSelectSection(sec)
            },
            sec.charAt(0).toUpperCase() + sec.slice(1)
          )
        )
      ]
    )
  ]);
}

function createIdeaCard(idea, { onToggleHeart }) {
  const sec = idea.section || "general";
  const iconName = SECTION_ICONS[sec] || "sparkles";

  return el("article", { className: `card idea-card ${idea.saved ? "is-favorite" : ""}` }, [
    el("div", { className: "idea-card-header" }, [
      el("div", { className: "idea-section-tag" }, [
        icon(iconName, "idea-sec-icon"),
        sec.toUpperCase()
      ]),
      el(
        "button",
        {
          type: "button",
          className: `btn-heart-toggle ${idea.saved ? "is-saved" : ""}`,
          "aria-label": idea.saved
            ? `Remove "${idea.title}" from favorites`
            : `Save "${idea.title}" to favorites`,
          "aria-pressed": idea.saved ? "true" : "false",
          onClick: () => onToggleHeart(idea)
        },
        [icon(idea.saved ? "heartFilled" : "heart")]
      )
    ]),
    el("h3", { className: "idea-title" }, idea.title),
    idea.whyItFits
      ? el("div", { className: "idea-why-box" }, [
          el("span", { className: "why-fits-label" }, "Why It Fits You:"),
          el("p", { className: "why-fits-text" }, idea.whyItFits)
        ])
      : null
  ]);
}

function createAddIdeaForm(onAddIdea) {
  const form = el(
    "form",
    {
      className: "card add-idea-card",
      onSubmit: (e) => {
        e.preventDefault();
        const titleInput = form.querySelector("#new-idea-title");
        const secSelect = form.querySelector("#new-idea-section");
        const whyInput = form.querySelector("#new-idea-why");
        const title = titleInput.value.trim();
        if (!title) return;

        onAddIdea({
          id: `idea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          section: secSelect.value || "general",
          title,
          whyItFits: whyInput.value.trim() || "User-added creative concept for celebration.",
          saved: true
        });

        titleInput.value = "";
        whyInput.value = "";
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [
        icon("plus"),
        "Propose Custom Celebration Concept"
      ]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el("label", { htmlFor: "new-idea-title", className: "form-label" }, "Concept Title"),
          el("input", {
            id: "new-idea-title",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Live Chai & Kulfi Tasting Station during Sangeet"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-idea-section", className: "form-label" }, "Section Domain"),
          el("select", { id: "new-idea-section", className: "form-input" }, [
            el("option", { value: "catering" }, "Catering & Food"),
            el("option", { value: "decor" }, "Decor & Aesthetics"),
            el("option", { value: "entertainment" }, "Entertainment"),
            el("option", { value: "keepsake" }, "Keepsake & Memorabilia"),
            el("option", { value: "rituals" }, "Rituals & Traditions"),
            el("option", { value: "general" }, "General Concept")
          ])
        ]),
        el("div", { className: "form-group flex-2" }, [
          el(
            "label",
            { htmlFor: "new-idea-why", className: "form-label" },
            "Why It Fits / Context"
          ),
          el("input", {
            id: "new-idea-why",
            type: "text",
            className: "form-input",
            placeholder: "e.g., Delights evening guests after dinner."
          })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [
          icon("plus"),
          "Add Concept"
        ])
      ])
    ]
  );
  return form;
}

/**
 * Render the Ideas Tab Panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderIdeasTab(event, { onUpdate, announce }) {
  const container = el("div", { className: "tabpanel-ideas" });
  if (!Array.isArray(event.ideas)) event.ideas = [];

  let activeSectionFilter = "all";
  let showFavoritesOnly = false;

  function renderView() {
    container.replaceChildren();
    const ideas = event.ideas;
    const favoriteCount = ideas.filter((i) => i.saved).length;
    const sections = Array.from(new Set(ideas.map((i) => i.section || "general"))).filter(Boolean);

    const filteredIdeas = ideas.filter((idea) => {
      if (showFavoritesOnly && !idea.saved) return false;
      if (activeSectionFilter !== "all" && (idea.section || "general") !== activeSectionFilter)
        return false;
      return true;
    });

    const topBar = createIdeasHeaderCard({
      sections,
      favoriteCount,
      showFavoritesOnly,
      activeSectionFilter,
      onToggleFavorites: () => {
        showFavoritesOnly = !showFavoritesOnly;
        renderView();
        announce?.(showFavoritesOnly ? "Showing favorites only." : "Showing all ideas.");
      },
      onSelectSection: (sec) => {
        activeSectionFilter = sec;
        renderView();
      }
    });

    const cardsGrid = el("div", { className: "ideas-grid" });
    if (filteredIdeas.length === 0) {
      cardsGrid.appendChild(
        el("div", { className: "card empty-state-card flex-full" }, [
          el(
            "p",
            { className: "empty-state-text" },
            showFavoritesOnly
              ? "No saved favorite ideas yet. Click the heart on any idea card to pin it here!"
              : "No ideas found in this category."
          )
        ])
      );
    } else {
      filteredIdeas.forEach((idea) => {
        cardsGrid.appendChild(
          createIdeaCard(idea, {
            onToggleHeart: (targetIdea) => {
              targetIdea.saved = !targetIdea.saved;
              onUpdate(event);
              renderView();
              announce?.(
                targetIdea.saved
                  ? `Saved "${targetIdea.title}" to favorites.`
                  : `Removed "${targetIdea.title}" from favorites.`
              );
            }
          })
        );
      });
    }

    const addIdeaForm = createAddIdeaForm((newIdea) => {
      event.ideas.push(newIdea);
      onUpdate(event);
      renderView();
      announce?.(`Added custom concept: "${newIdea.title}".`);
    });

    container.append(topBar, cardsGrid, addIdeaForm);
  }

  renderView();
  return container;
}
