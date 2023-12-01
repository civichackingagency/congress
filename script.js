document.body.setAttribute('data-bs-theme', localStorage.getItem('theme') || 'dark');
document.getElementById('theme-icon').src = 'icons/' + (document.body.getAttribute('data-bs-theme') == 'light' ? 'moon' : 'sun') + '.svg';

const params = new URLSearchParams(location.search);
const page = params.get('page');
const req = new XMLHttpRequest();

if (page == 'house' || page == 'senate') {
    document.getElementById('member-list').style.display = 'revert';
    document.querySelector('.active').classList.remove('active');
    document.getElementById('nav-' + page).children[0].classList.add('active');

    const chamber = page == 'house' ? 'House of Representatives' : 'Senate';
    document.getElementById('jumbotron-title').innerHTML = 'U.S. ' + chamber;
    document.title = (page == 'house' ? 'House of Representatives' : 'Senators') + ' - Civic Hacking Agency';
    let finishedLoading = false;
    let members = [];
    req.open('GET', /*'https://get.usa.govfresh.com/get?url=https://api.congress.gov/v3/member&limit=250&format=json'*/'https://api.congress.gov/v3/member?limit=250&format=json&api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L');
    req.onload = function () {
        let data = JSON.parse(this.response);
        console.log(data);
        finishedLoading = true;
        for (const member of data.members)
            if (member.terms && member.terms.item[member.terms.item.length - 1].chamber == chamber && !member.terms.item[member.terms.item.length - 1].endYear) {
                finishedLoading = false;
                break;
            }
        if (!finishedLoading && data.pagination.next) {
            req.open('GET', /*'https://get.usa.govfresh.com/get?url=' + */data.pagination.next + '&api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L');
            req.send();
        }
        members = members.concat(data.members.filter(member => member.terms && member.terms.item[member.terms.item.length - 1].chamber == chamber && !member.terms.item[member.terms.item.length - 1].endYear));
        if (finishedLoading) {
            members = members.sort((a, b) => a.name.localeCompare(b.name));
            for (let i = 0; i < members.length; i++) {
                let deck;
                const member = members[i];
                let name = member.name.split(',');
                [name[0], name[1]] = [name[1], name[0]];
                name = name.toString().replaceAll(',', ' ');
                if (name.slice(-1) == '.')
                    name = name.slice(0, -1);
                deck = document.getElementById('cards');
                deck.innerHTML += `
                    <div class="col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex align-items-stretch">
                        <div class="card clean">
                            <div class="card-body">
                                <div class="fancy-image">
                                    <img src="${(member.depiction && member.depiction.imageUrl) ? member.depiction.imageUrl : 'person.png'}" class="md rounded-circle mb-3 ${member.partyName.toLowerCase().replace(' ', '-')}" alt="Headshot of ${name}">
                                </div>
                                <h3 class="h5">
                                    <a class="stretched-link" href="?page=member&member=${member.bioguideId}">${name}</a>
                                </h3>
                                <p class="description small">${member.state} (${member.partyName})</p>
                            </div>
                        </div>
                    </div>`;
            }

            document.querySelector('#member-list img.loading').style.display = 'none';
        }
    }
    req.send();
}
else if (page == 'member') {
    document.getElementById('member-data').style.display = 'revert';
    req.open('GET', /*'https://get.usa.govfresh.com/get?url=*/'https://api.congress.gov/v3/member/' + params.get('member') + '?api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L&format=json');
    req.onload = function () {
        const data = JSON.parse(this.response).member;

        const currentTerm = data.terms[data.terms.length - 1];
        document.head.querySelector('title').innerHTML = currentTerm.memberType + ' ' + data.directOrderName;
        document.getElementById('jumbotron-title').innerHTML = currentTerm.memberType + ' ' + data.directOrderName;
        document.getElementById('jumbotron-subtitle').innerHTML = `${data.state} (${data.partyHistory[data.partyHistory.length - 1].partyName})`;
        document.querySelector('#member-data #member-info').innerHTML = `
            <div class="fancy-image">
                <img class="rounded-circle xl  mb-3 ${data.partyHistory[data.partyHistory.length - 1].partyName.toLowerCase().replace(' ', '-')}" alt="${data.directOrderName}" src="${data.depiction.imageUrl || '/assets/img/icons/1F9D1-200D-1F4BC.png'}">
            </div>
            <h3>Contact</h3>
            <ul>
            <li>Mail: ${data.addressInformation.officeAddress}</li>
            <li>Phone: <a href="tel:${data.addressInformation.phoneNumber}">${data.addressInformation.phoneNumber}</a></li>
            <li>Web: <a href="${data.officialWebsiteUrl}">${new URL(data.officialWebsiteUrl).hostname.replace('www.', '')}</a></li>
            </ul>
            <h3>Terms</h3>
            <ul>
                ${data.terms.reverse().map(term => `<li>${term.startYear}-${term.endYear || 'Present'} (${term.chamber})</li>`).join('\n')}
            </ul>
        `;
        if (data.depiction && data.depiction.attribution)
            document.getElementById('data-source').innerHTML += `<br>Image source: ${data.depiction.attribution}`;

        if (data.sponsoredLegislation) {
            req.open('GET', /*'https://get.usa.govfresh.com/get?url=' +*/ data.sponsoredLegislation.url + '?format=json&limit=250&api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L');
            req.onload = function () {
                let legislation = JSON.parse(this.response).sponsoredLegislation.filter(piece => piece.type != null && piece.congress == currentTerm.congress);
                document.getElementById('legislation-count').innerText = '(' + legislation.length + ' most recent in Congress ' + currentTerm.congress + ')';
                for (let i = 0; i < legislation.length; i++)
                    legislation[i].introducedDate = new Date(legislation[i].introducedDate);
                legislation.sort((a, b) => { return a.introducedDate.getTime() - b.introducedDate.getTime(); });
                const list = document.querySelector('#legislation');
                let topics = new Map();
                if (legislation.length == 0)
                    list.innerHTML += '<p>' + data.directOrderName + ' has not sponsored any legislation yet.</p>';
                else {
                    legislation.reverse().forEach(piece => {
                        if (piece.policyArea.name)
                            if (!topics.has(piece.policyArea.name))
                                topics.set(piece.policyArea.name, 1);
                            else
                                topics.set(piece.policyArea.name, topics.get(piece.policyArea.name) + 1);
                        list.innerHTML += `
                            <a class="list-group-item" target="_blank" href="https://congress.gov/bill/${currentTerm.congress}th-congress/${currentTerm.chamber.substring(0, (currentTerm.chamber.indexOf(' ') + 1 || currentTerm.chamber.length + 1) - 1).toLowerCase()}-${piece.type == 'S' || piece.type == 'HR' ? 'bill' : piece.type == 'SRES' || piece.type == 'HRES' ? 'resolution' : piece.type == 'SCONRES' ? 'concurrent-resolution' : 'joint-resolution'}/${piece.number}">
                                ${piece.title} (${piece.introducedDate.toLocaleDateString()})
                            </a>
                        `;
                    });
                }

                document.querySelector('#sponsored-legislation img.loading').style.display = 'none';

                req.open('GET', /*'https://get.usa.govfresh.com/get?url=' + */data.cosponsoredLegislation.url + '?format=json&limit=250&api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L');
                req.onload = function () {
                    const cosponsoredLegislation = JSON.parse(this.response).cosponsoredLegislation.filter(piece => piece.type != null && piece.congress == currentTerm.congress);
                    for (const piece of cosponsoredLegislation)
                        if (piece.policyArea.name)
                            if (!topics.has(piece.policyArea.name))
                                topics.set(piece.policyArea.name, 1);
                            else
                                topics.set(piece.policyArea.name, topics.get(piece.policyArea.name) + 1);

                    const topicsDiv = document.getElementById('topics');
                    topics = [...topics.entries()].sort((a, b) => b[1] - a[1]);
                    const totalPieces = topics.reduce((a, b) => a + b[1], 0);
                    let randomIndex = parseInt(data.bioguideId.replaceAll(/[^0-9]/g, ''));
                    topics.forEach(topic => {
                        const hsl = [];
                        for (let i = 0; i < 3; i++) {
                            let random = Math.sin(randomIndex) * 10000;
                            hsl[i] = random - Math.floor(random);
                            randomIndex++;
                        }
                        // TODO: smallest box should be 1rem + padding
                        const percent = Math.round(100 * topic[1] / totalPieces);
                        topicsDiv.innerHTML += `
                            <div class="topic" style="--topic-dark: hsl(${Math.round(hsl[0] * 360)}, ${Math.round(hsl[1] * 30) + 20}%, ${Math.round(hsl[2] * 30) + 20}%); --topic-light: hsl(${Math.round(hsl[0] * 360)}, ${Math.round(hsl[1] * 30) + 60}%, ${Math.round(hsl[2] * 30) + 60}%); max-height: ${window.innerHeight * topic[1] / totalPieces}px; min-height: ${window.innerHeight * topic[1] / totalPieces}px">
                                <span>${topic[0]} (${percent >= 1 ? percent : '<1'}%)</span>
                            </div>`;
                    });

                    document.querySelector('#legislative-topics img.loading').style.display = 'none';
                };
                req.send();
            };
            req.send();
        }
    };
    req.send();
}
else {
    document.getElementById('home').style.display = 'revert';
    document.querySelector('.active').classList.remove('active');
    document.getElementById('nav-home').classList.add('active');
    fetch('https://api.congress.gov/v3/congress?api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L').then(res => res.json()).then(data => {
        const current = data.congresses[0].name.substring(0, 3);
        fetch('https://api.congress.gov/v3/committee/' + current + '?api_key=fvA9u4qpBK9EY8vGLkPI55IDAh2qO0ImrORbmr0L&limit=5000').then(res => res.json()).then(data => {
            console.log(data);
        });
    });
}