import { useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./style.css";

const files = import.meta.glob("../../../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const extras = import.meta.glob(
  [
    "../../../examples/*.tsx",
    "../../../apps/playground/src/custom-fields/*.ts",
    "../../../apps/playground/src/custom-fields/*.tsx",
    "../../../scripts/test-consumer.mjs",
    "../../../*VERIFICATION.md",
    "../../../QA-AUDIT.md",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;
const entries = [
  ["README.md", "Overview", "Start here"],
  ["getting-started.md", "Getting started", "Start here"],
  ["api.md", "API reference", "Build with Formcraft"],
  ["fields-and-layouts.md", "Fields & layouts", "Build with Formcraft"],
  ["hooks-and-extensibility.md", "Hooks & extensions", "Build with Formcraft"],
  ["custom-fields.md", "Custom fields", "Build with Formcraft"],
  ["submissions-and-backends.md", "Submissions & backends", "Integrate"],
  ["email-setup.md", "Email notifications", "Integrate"],
  ["testing-and-troubleshooting.md", "Testing & troubleshooting", "Resources"],
  ["roadmap.md", "What’s next", "Resources"],
];
const sources = Object.fromEntries(
  Object.entries({ ...files, ...extras }).map(([path, value]) => [
    path.split("/").at(-1)!,
    value,
  ]),
);
const requested =
  new URLSearchParams(location.search).get("page") || "README.md";
const page = sources[requested] ? requested : "README.md";
const entry = entries.find((e) => e[0] === page);
const title = entry?.[1] || page;
const raw = sources[page] || "";
const sourcePage = !page.endsWith(".md");
const content = sourcePage
  ? `# ${page}\n\nApplication-owned reference example.\n\n\`\`\`${page.endsWith(".tsx") ? "tsx" : "js"}\n${raw}\n\`\`\``
  : raw;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
const headings = [
  ...content.replace(/```[\s\S]*?```/g, "").matchAll(/^## (.+)$/gm),
].map((m) => ({ text: m[1], id: slug(m[1]) }));
const base = import.meta.env.BASE_URL;
const hrefFor = (file: string) => `${base}docs/?page=${encodeURIComponent(file)}`;
function plain(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (node && typeof node === "object" && "props" in node)
    return plain((node.props as { children: ReactNode }).children);
  return "";
}
function CodeBlock({ children }: { children: ReactNode }) {
  const [state, setState] = useState("Copy");
  const ref = useRef<HTMLPreElement>(null);
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>Code example</span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                ref.current?.textContent || "",
              );
              setState("Copied");
            } catch {
              setState("Select text to copy");
            }
          }}
          aria-live="polite"
        >
          {state}
        </button>
      </div>
      <pre ref={ref} tabIndex={0}>
        {children}
      </pre>
    </div>
  );
}
function App() {
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const results = entries.filter(([file, label]) =>
    `${label} ${sources[file]}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  document.title = `${title} · Formcraft docs`;
  return (
    <div className="docs-shell">
      <a className="skip" href="#article">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <a href={`${base}docs/`} aria-label="Formcraft documentation">
            <img
              className="brand-logo"
              src={`${base}brand/formcraft-logo-primary.svg`}
              alt="Formcraft"
              width="145"
              height="28"
            />
            <span className="docs-label">/ docs</span>
          </a>
          <button
            className="menu"
            aria-expanded={menu}
            aria-controls="doc-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? "Close" : "Menu"}
          </button>
        </div>
        <div id="doc-navigation" className={`navigation ${menu ? "open" : ""}`}>
          <label className="search-label" htmlFor="search">
            Search documentation
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search the docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() ? (
            <nav aria-label="Search results">
              <p className="nav-group" role="status">
                {results.length} results
              </p>
              {results.map(([file, label]) => {
                const text = sources[file].replace(/[#`*]/g, "");
                const pos = Math.max(
                  0,
                  text.toLowerCase().indexOf(query.trim().toLowerCase()) - 35,
                );
                return (
                  <a className="result" key={file} href={hrefFor(file)}>
                    {label}
                    <small>{text.slice(pos, pos + 105)}…</small>
                  </a>
                );
              })}
              {!results.length && (
                <p className="no-results">
                  No matches. Try “email”, “columns”, or “onSubmit”.
                </p>
              )}
            </nav>
          ) : (
            <nav aria-label="Documentation">
              {entries.map(([file, label, group], i) => (
                <div key={file}>
                  {entries[i - 1]?.[2] !== group && (
                    <p className="nav-group">{group}</p>
                  )}
                  <a
                    aria-current={page === file ? "page" : undefined}
                    href={hrefFor(file)}
                  >
                    {label}
                  </a>
                </div>
              ))}
            </nav>
          )}
          <div className="sidebar-bottom">
            <span className="version">0.0.0-prototype</span>
            <a href={base}>
              Open form builder <span aria-hidden="true">↗</span>
            </a>
            <p>
              Standalone library.
              <br />
              Your application, your backend.
            </p>
          </div>
        </div>
      </aside>
      <main id="article" tabIndex={-1}>
        <div className="breadcrumb">
          Documentation <span>/</span> {entry?.[2] || "Reference example"}
        </div>
        <article>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 id={slug(plain(children))}>
                  {children}
                  <a
                    className="heading-anchor"
                    href={`#${slug(plain(children))}`}
                    aria-label={`Link to ${plain(children)}`}
                  >
                    #
                  </a>
                </h2>
              ),
              pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
              table: ({ children }) => (
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Reference table"
                  tabIndex={0}
                >
                  <table>{children}</table>
                </div>
              ),
              a: ({ href, children }) => {
                const name = href?.split("#")[0].split("/").at(-1) || "";
                return (
                  <a
                    href={
                      sources[name]
                        ? hrefFor(name) +
                          (href?.includes("#") ? "#" + href.split("#")[1] : "")
                        : href
                    }
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </article>
        <footer>
          <span>Formcraft documentation · Prototype</span>
          <a href={hrefFor("roadmap.md")}>Implementation roadmap →</a>
        </footer>
        {entry && (
          <div className="page-links">
            {[
              entries[entries.indexOf(entry) - 1],
              entries[entries.indexOf(entry) + 1],
            ].map((item, i) =>
              item ? (
                <a key={i} href={hrefFor(item[0])}>
                  <small>{i === 0 ? "← Previous" : "Next →"}</small>
                  {item[1]}
                </a>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        )}
      </main>
      <aside className="outline" aria-label="On this page">
        <p>On this page</p>
        {headings.map((h) => (
          <a key={h.id} href={`#${h.id}`}>
            {h.text}
          </a>
        ))}
        <div className="release-note">
          <strong>Prototype release</strong>
          <span>
            Available APIs and proposed features are documented separately.
          </span>
        </div>
      </aside>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
