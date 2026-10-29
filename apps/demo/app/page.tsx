import { Editable } from "@thereactnativerewind/inplace/server";

export default function HomePage() {
  return (
    <main className="page">
      <header className="nav">
        <Editable id="brand.name">Harbor & Co.</Editable>
        <Editable id="nav.index">Index</Editable>
      </header>

      <section className="hero">
        <p className="index">
          <Editable id="hero.index">Studio 04</Editable>
        </p>
        <div>
          <p className="kicker">
            <Editable id="hero.kicker">Houses & public rooms</Editable>
          </p>
          <h1>
            <Editable id="hero.title">Rooms that hold the light.</Editable>
          </h1>
          <p className="lede">
            <Editable id="hero.lede">
              Harbor designs quiet houses, libraries, and public rooms for people who live with books and weather.
            </Editable>
          </p>
          <div className="actions">
            <a className="button" href="#work">
              <Editable id="hero.primary">Start a project</Editable>
            </a>
            <a className="button-quiet" href="#note">
              <Editable id="hero.secondary">Field notes</Editable>
            </a>
          </div>
        </div>
      </section>

      <section className="work" id="work">
        <h2>
          <Editable id="work.heading">Selected work</Editable>
        </h2>
        <article className="row">
          <span className="num">01</span>
          <strong>
            <Editable id="work.1.title">The lime house</Editable>
          </strong>
          <p>
            <Editable id="work.1.body">
              A courtyard house in Lisbon. Thick walls, a fig tree, one long table.
            </Editable>
          </p>
        </article>
        <article className="row">
          <span className="num">02</span>
          <strong>
            <Editable id="work.2.title">Reading room</Editable>
          </strong>
          <p>
            <Editable id="work.2.body">
              A neighborhood library with oak shelves and a roof that opens to the rain.
            </Editable>
          </p>
        </article>
        <article className="row">
          <span className="num">03</span>
          <strong>
            <Editable id="work.3.title">The boathouse</Editable>
          </strong>
          <p>
            <Editable id="work.3.body">
              A small public room on a river, built to be swept out and used again.
            </Editable>
          </p>
        </article>
      </section>

      <section className="note" id="note">
        <blockquote>
          <Editable id="note.quote">A good room is a decision about how to spend an afternoon.</Editable>
        </blockquote>
        <p>
          <Editable id="note.by">Field notes, 2024</Editable>
        </p>
      </section>

      <footer className="footer">
        <span>
          <Editable id="footer.line">Lisbon & Portland</Editable>
        </span>
        <p className="hint">
          On a preview deployment the words are editable straight away. On production, visit{" "}
          <code>/?inplace=login</code> and sign in with an allowlisted email. Drafts stay off the
          live page until you publish.
        </p>
      </footer>
    </main>
  );
}
