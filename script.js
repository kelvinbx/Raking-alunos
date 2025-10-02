// script.js

// ... (o topo do seu arquivo com a lista de jogadores continua igual) ...

// Função para fazer chamadas à API da Riot de forma segura através do nosso proxy
async function fetchRiotData(riotUrl) {
    const response = await fetch(`/api/proxy?riotUrl=${riotUrl}`);
    if (!response.ok) {
        console.error("Erro ao buscar dados do proxy para:", riotUrl);
        return null;
    }
    return response.json();
}

// -------------------------------------------------------------------
// ▼▼▼ SUBSTITUA SUA FUNÇÃO ANTIGA POR ESTA VERSÃO COMPLETA ▼▼▼
// -------------------------------------------------------------------
async function getPlayerData({ gameName, tagLine }) {
    try {
        // 1. Obter PUUID (identificador universal)
        const accountData = await fetchRiotData(`${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
        if (!accountData || !accountData.puuid) {
            console.error(`Não foi possível encontrar a conta para ${gameName}#${tagLine}`);
            return null;
        }
        const { puuid } = accountData;

        // 2. Obter dados do Invocador (ID, ícone)
        const summonerData = await fetchRiotData(`${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`);
        
        // --- ESTA É A CORREÇÃO PRINCIPAL ---
        // Verificamos não só se summonerData existe, mas se ele contém a propriedade 'id'.
        if (!summonerData || !summonerData.id) {
            console.error(`Dados do invocador incompletos para ${gameName}. O 'summonerId' não foi encontrado.`);
            return null; // Pula este jogador e continua para o próximo.
        }

        const { id: summonerId, profileIconId } = summonerData;

        // 3. Obter dados de Ranking (Elo)
        const rankData = await fetchRiotData(`${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`);
        if (!rankData) {
            // Isso pode acontecer se o jogador não tiver jogado partidas ranqueadas
            return { gameName, tagLine, profileIconId, tier: 'UNRANKED', rank: '', leaguePoints: 0 };
        }
        
        const soloQueueData = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
        
        return {
            gameName,
            tagLine,
            profileIconId,
            tier: soloQueueData ? soloQueueData.tier : 'UNRANKED',
            rank: soloQueueData ? soloQueueData.rank : '',
            leaguePoints: soloQueueData ? soloQueueData.leaguePoints : 0,
        };
    } catch (error) {
        console.error(`Falha crítica ao buscar dados para ${gameName}#${tagLine}:`, error);
        return null; 
    }
}
// -------------------------------------------------------------------
// ▲▲▲ O RESTO DO SEU ARQUIVO (sortPlayers, main, etc.) CONTINUA IGUAL ▲▲▲
// -------------------------------------------------------------------


// Função para ordenar os jogadores por ranking (continua igual)
function sortPlayers(players) {
    const tierOrder = { 'CHALLENGER': 1, 'GRANDMASTER': 2, 'MASTER': 3, 'DIAMOND': 4, 'EMERALD': 5, 'PLATINUM': 6, 'GOLD': 7, 'SILVER': 8, 'BRONZE': 9, 'IRON': 10, 'UNRANKED': 11 };
    const rankOrder = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };

    players.sort((a, b) => {
        if (tierOrder[a.tier] < tierOrder[b.tier]) return -1;
        if (tierOrder[a.tier] > tierOrder[b.tier]) return 1;
        if (rankOrder[a.rank] < rankOrder[b.rank]) return -1;
        if (rankOrder[a.rank] > rankOrder[b.rank]) return 1;
        if (a.leaguePoints > b.leaguePoints) return -1;
        if (a.leaguePoints < b.leaguePoints) return 1;
        return 0;
    });
    return players;
}

// Função principal que executa tudo (continua igual)
async function main() {
    const loadingElement = document.getElementById('loading');
    const playerListElement = document.getElementById('player-list');
    
    loadingElement.style.display = 'block';
    playerListElement.innerHTML = '';

    const unsortedPlayers = await Promise.all(playersConfig.map(getPlayerData));
    const validPlayers = unsortedPlayers.filter(p => p !== null);
    const sortedPlayers = sortPlayers(validPlayers);
    
    loadingElement.style.display = 'none';

    sortedPlayers.forEach(player => {
        const ddragonVersion = "14.20.1"; // Versão atual
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <img class="profile-icon" src="https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${player.profileIconId}.png" alt="Ícone de Perfil">
            <div class="player-info">
                <h2>${player.gameName} #${player.tagLine}</h2>
                <p>${player.tier === 'UNRANKED' ? 'Sem Ranque' : `${player.tier} ${player.rank} - ${player.leaguePoints} PDL`}</p>
            </div>
            <div class="rank-info">
                ${player.tier !== 'UNRANKED' ? `<img class="rank-emblem" src="https://opgg-static.akamaized.net/images/medals_new/${player.tier.toLowerCase()}.png" alt="Emblema de ${player.tier}">` : ''}
            </div>
        `;
        playerListElement.appendChild(playerCard);
    });
}

// Inicia o processo quando a página carregar
main();
