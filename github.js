/* ---------------------------------------------------------
   GITHUB PROFILE STORAGE
--------------------------------------------------------- */

const GITHUB_CONFIG = {

  owner: 'NicRimer',

  repo: 'Test_engine',

  branch: 'main',

  profilesDirectory: 'profiles'

};


window.GitHubProfiles = {


  async request(path, options = {}) {

    const token =
      sessionStorage.getItem(
        'githubToken'
      );


    const headers = {

      Accept:
        'application/vnd.github+json',

      'X-GitHub-Api-Version':
        '2022-11-28',

      ...(options.body
        ? {
            'Content-Type':
              'application/json'
          }
        : {}),

      ...(token
        ? {
            Authorization:
              `Bearer ${token}`
          }
        : {})

    };


    const response =
      await fetch(
        `https://api.github.com${path}`,
        {
          ...options,
          headers
        }
      );


    if (!response.ok) {

      let detail = '';

      try {

        const body =
          await response.json();

        if (body.message) {
          detail =
            `: ${body.message}`;
        }

      } catch {}


      throw new Error(
        `GitHub request failed (${response.status})${detail}`
      );

    }


    return response.status === 204
      ? null
      : response.json();

  },


  pathFor(id) {

    if (
      !/^[A-Za-z0-9_-]+$/.test(id)
    ) {

      throw new Error(
        'Invalid Profile ID.'
      );

    }


    return `${
      GITHUB_CONFIG.profilesDirectory
    }/${id}.json`;

  },


  async load(id) {

    const path =
      this.pathFor(id);


    const data =
      await this.request(

        `/repos/${
          GITHUB_CONFIG.owner
        }/${
          GITHUB_CONFIG.repo
        }/contents/${
          encodeURIComponent(path)
        }?ref=${
          encodeURIComponent(
            GITHUB_CONFIG.branch
          )
        }`

      );


    const profile =
      JSON.parse(
        base64ToUtf8(
          data.content
        )
      );


    profile.__githubSha =
      data.sha;


    return profile;

  },


  async create(profile) {

    const path =
      this.pathFor(profile.id);


    const content =
      utf8ToBase64(
        JSON.stringify(
          profile,
          null,
          2
        )
      );


    const data =
      await this.request(

        `/repos/${
          GITHUB_CONFIG.owner
        }/${
          GITHUB_CONFIG.repo
        }/contents/${
          encodeURIComponent(path)
        }`,

        {

          method: 'PUT',

          body:
            JSON.stringify({

              message:
                `Create profile ${profile.id}`,

              content,

              branch:
                GITHUB_CONFIG.branch

            })

        }

      );


    profile.__githubSha =
      data.content.sha;


    return profile;

  },


  async update(
    profile,
    maxRetries = 3
  ) {

    const path =
      this.pathFor(profile.id);


    for (
      let attempt = 0;
      attempt < maxRetries;
      attempt++
    ) {

      let sha =
        profile.__githubSha;


      if (!sha) {

        const latest =
          await this.load(
            profile.id
          );

        sha =
          latest.__githubSha;

      }


      const cleanProfile =
        {
          ...profile
        };


      delete cleanProfile.__githubSha;


      try {

        const data =
          await this.request(

            `/repos/${
              GITHUB_CONFIG.owner
            }/${
              GITHUB_CONFIG.repo
            }/contents/${
              encodeURIComponent(path)
            }`,

            {

              method: 'PUT',

              body:
                JSON.stringify({

                  message:
                    `Update profile ${profile.id}`,

                  content:
                    utf8ToBase64(
                      JSON.stringify(
                        cleanProfile,
                        null,
                        2
                      )
                    ),

                  sha,

                  branch:
                    GITHUB_CONFIG.branch

                })

            }

          );


        profile.__githubSha =
          data.content.sha;


        return profile;

      } catch (err) {

        if (
          attempt ===
          maxRetries - 1
        ) {

          throw err;

        }


        const latest =
          await this.load(
            profile.id
          );


        profile =
          mergeProfileResults(
            latest,
            profile
          );


        profile.__githubSha =
          latest.__githubSha;

      }

    }

  }

};


/* ---------------------------------------------------------
   CONCURRENT RESULT MERGE
--------------------------------------------------------- */

function mergeProfileResults(
  latest,
  local
) {

  const byId =
    new Map(
      (latest.results || [])
        .map(
          result =>
            [result.id, result]
        )
    );


  for (
    const result
    of local.results || []
  ) {

    byId.set(
      result.id,
      result
    );

  }


  return {

    ...latest,

    ...local,

    results:
      [...byId.values()]
        .sort(
          (a, b) =>
            new Date(
              a.completedAt
            ) -
            new Date(
              b.completedAt
            )
        )

  };

}


/* ---------------------------------------------------------
   UTF-8 / BASE64
--------------------------------------------------------- */

function utf8ToBase64(value) {

  const bytes =
    new TextEncoder()
      .encode(value);


  let binary = '';


  bytes.forEach(
    byte =>
      binary +=
        String.fromCharCode(byte)
  );


  return btoa(binary);

}


function base64ToUtf8(value) {

  const binary =
    atob(
      value.replace(/\n/g, '')
    );


  const bytes =
    Uint8Array.from(
      binary,
      char =>
        char.charCodeAt(0)
    );


  return new TextDecoder()
    .decode(bytes);

}
