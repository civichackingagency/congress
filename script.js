const params = new URLSearchParams(location.search);
const page = params.get('page');
const req = new XMLHttpRequest();

if (page == 'house' || page == 'senate') {
    document.getElementById('member-list').style.display = 'revert';

    const chamber = page == 'house' ? 'House of Representatives' : 'Senate';
    let finishedLoading = false;
    let members = [];
    req.open('GET', 'https://api.congress.gov/v3/member?api_key=hExsrBBSxIrdS8bwKMuQd3oxFjLMEoIb4YkQZNMx&limit=250&format=json');
    req.onload = function () {
        let data = JSON.parse(this.response);
        finishedLoading = true;
        for (const member of data.members)
            if (member.terms && member.terms.item[member.terms.item.length - 1].chamber == chamber && !member.terms.item[member.terms.item.length - 1].endYear) {
                finishedLoading = false;
                break;
            }
        if (false && !finishedLoading && data.pagination.next) {
            req.open('GET', data.pagination.next + '&api_key=hExsrBBSxIrdS8bwKMuQd3oxFjLMEoIb4YkQZNMx');
            req.send();
        }
        members = members.concat(data.members.filter(member => member.terms && member.terms.item[member.terms.item.length - 1].chamber == chamber && !member.terms.item[member.terms.item.length - 1].endYear));
        if (true || finishedLoading) {
            members = members.sort((a, b) => a.name.localeCompare(b.name));
            console.log(members)
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
                    <div class="col-12 col-sm-12 col-md-3 col-lg-3 col-xl-3 d-flex align-items-stretch">
                        <div class="card clean">
                            <div class="card-body">
                                <div class="fancy-2 ">
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
        };
    }
    req.send();
}
else if (page == 'member') {
    document.getElementById('member-data').style.display = 'revert';
    req.open('GET', 'https://api.congress.gov/v3/member/' + params.get('member') + '?api_key=hExsrBBSxIrdS8bwKMuQd3oxFjLMEoIb4YkQZNMx&format=json');
    req.onload = function () {
        const data = JSON.parse(this.response).member;
        console.log(data);

        const currentTerm = data.terms[data.terms.length - 1];
        document.head.querySelector('title').innerHTML = currentTerm.memberType + ' ' + data.directOrderName;
        document.querySelector('.jumbotron h1').innerHTML = currentTerm.memberType + ' ' + data.directOrderName;
        document.querySelector('.jumbotron p.lead').innerHTML = `${data.state} (${data.partyHistory[data.partyHistory.length - 1].partyName})`;
        document.querySelector('#member-data .col-sm-3').innerHTML = `
             <div class="fancy-2"><img class="rounded-circle xl  mb-3 ${data.partyHistory[data.partyHistory.length - 1].partyName.toLowerCase().replace(' ', '-')}" alt="${data.directOrderName}" src="${data.depiction.imageUrl || '/assets/img/icons/1F9D1-200D-1F4BC.png'}"></div>
         `;
        document.querySelector('#member-data .col-sm-9').innerHTML = `
            <h2>Contact</h2>
            <ul>
            <li>Mail: ${data.addressInformation.officeAddress}</li>
            <li>Phone: <a href="tel:${data.addressInformation.phoneNumber}">${data.addressInformation.phoneNumber}</a></li>
            <li>Website: <a href="${data.officialWebsiteUrl}">${new URL(data.officialWebsiteUrl).hostname}</a></li>
            </ul>
            <h2>Terms</h2>
            <ul class="terms"></ul>
            <h2>Sponsored legislation</h2>
            <p class="source" id="legislation-count"></p>
            <ul class="legislation"></ul>
        `;
        if (data.depiction)
            document.querySelector('#member-data .col-sm-3').innerHTML += `<p class="source">Photo source: ${data.depiction.attribution || ''}</p>`;
        data.terms.reverse().forEach(term => {
            document.querySelector('ul.terms').innerHTML += `<li>${term.startYear}-${term.endYear || 'Present'} (${term.chamber})</li>`
        });

        if (data.sponsoredLegislation) {
            req.open('GET', data.sponsoredLegislation.url + '?format=json&limit=250&api_key=hExsrBBSxIrdS8bwKMuQd3oxFjLMEoIb4YkQZNMx');
            req.onload = function () {
                let legislation = JSON.parse(this.response).sponsoredLegislation.filter(piece => piece.type != null && piece.congress == currentTerm.congress);
                console.log(legislation);
                document.getElementById('legislation-count').innerText = '(' + legislation.length + ' most recent in Congress ' + currentTerm.congress + ')';
                for (let i = 0; i < legislation.length; i++)
                    legislation[i].introducedDate = new Date(legislation[i].introducedDate);
                legislation.sort((a, b) => { return a.introducedDate.getTime() - b.introducedDate.getTime(); });
                const ul = document.querySelector('ul.legislation');
                if (legislation.length == 0)
                    ul.innerHTML += '<li>' + data.directOrderName + ' has not sponsored any legislation yet.</li>';
                let topics = new Map();
                legislation.reverse().forEach(piece => {
                    if (piece.policyArea.name)
                        if (!topics.has(piece.policyArea.name))
                            topics.set(piece.policyArea.name, 1);
                        else
                            topics.set(piece.policyArea.name, topics.get(piece.policyArea.name) + 1);
                    ul.innerHTML += `
                    <li><a target="_blank" href="https://congress.gov/bill/${currentTerm.congress}th-congress/${currentTerm.chamber.substring(0, currentTerm.chamber.indexOf(' ')).toLowerCase()}-${piece.type == 'S' || piece.type == 'HR' ? 'bill' : piece.type == 'SRES' || piece.type == 'HRES' ? 'resolution' : piece.type == 'SCONRES' ? 'concurrent-resolution' : 'joint-resolution'}/${piece.number}">${piece.title} (${piece.introducedDate.toLocaleDateString()})</a></li>
                `;
                });

                req.open('GET', data.cosponsoredLegislation.url + '?format=json&limit=250&api_key=hExsrBBSxIrdS8bwKMuQd3oxFjLMEoIb4YkQZNMx');
                req.onload = function () {
                    const cosponsoredLegislation = JSON.parse(this.response).cosponsoredLegislation.filter(piece => piece.type != null && piece.congress == currentTerm.congress);
                    console.log(cosponsoredLegislation)
                    for (const piece of cosponsoredLegislation)
                        if (piece.policyArea.name)
                            if (!topics.has(piece.policyArea.name))
                                topics.set(piece.policyArea.name, 1);
                            else
                                topics.set(piece.policyArea.name, topics.get(piece.policyArea.name) + 1);

                    /*const colors = [
                        '#f2938c',
                        '#f8e1de',
                        '#f3bf90',
                        '#dec69a',
                        '#f5e6af',
                        '#dfeacd',
                        '#c7efe2',
                        '#ccecf2',
                        '#d9e8f6',
                        '#e5e4fa',
                        '#ebe3f9',
                    ];*/
                    document.querySelector('#member-data .col-sm-3').innerHTML += '<p>' + currentTerm.memberType + ' ' + data.lastName + '\'s legislative topics:</p><div id="topics"></div>';
                    const topicsDiv = document.querySelector('#topics');
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
                        // TODO: box is too big
                        // TODO: Sanders's
                        // TODO: smallest box should be 1rem + padding
                        const color = `hsl(${Math.round(hsl[0] * 360)}, ${Math.round(hsl[1] * 30) + 60}%, ${Math.round(hsl[2] * 30) + 60}%)`;
                        const percent = Math.round(100 * topic[1] / totalPieces);
                        topicsDiv.innerHTML += `<div class="topic" style="background-color: ${color}; max-height: ${window.innerHeight * topic[1] / totalPieces}px; min-height: ${window.innerHeight * topic[1] / totalPieces}px"><span>${topic[0]} (${percent >= 1 ? percent : '<1'}%)</span></div>`;
                    });
                };
                req.send();
            };
            req.send();
        }
    };
    req.send();
}
else
    document.getElementById('home').style.display = 'revert';