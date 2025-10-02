// script.js

// --- CONFIGURAÇÃO ---
// Adicione os Riot IDs dos jogadores que você quer mostrar aqui
const playersConfig = [
    // Substitua pelos jogadores que você quer na lista
    { gameName: 'wYzards', tagLine: 'GAME' },
    { gameName: 'Dorrows', tagLine: '0488' },
    { gameName: 'Gordaker', tagLine: 'prata' },
];
// Região principal para buscar os dados da conta.
// americas (NA, BR, LAN, LAS), asia (KR, JP), europe (EUNE, EUW, TR, RU)
const region = 'americas'; 
// Região/plataforma para buscar os dados de ranking (BR1, NA1, etc.)
const platform = 'br1'; 

// --- ELEMENTOS DA PÁGINA ---
const playerListElement = document.getElementById('player-list');
const loadingElement = document.getElementById('loading');

// Função para fazer chamadas à API da Riot de forma segura através do nosso proxy
async function fetchRiotData(riotUrl) {
    // Note que a chamada é para o nosso próprio site, na pasta /api/proxy
    const response = await fetch(`/api/proxy?riotUrl=${riotUrl}`);
    if (!response.ok) {
        console.error("Erro ao buscar dados do proxy para:", riotUrl);
        return null;
    }
    return response.json();
}

// Função para buscar todos os dados de um único jogador
async function getPlayerData({ gameName, tagLine }) {
    try {
        // 1. Obter PUUID (identificador universal)
        const accountData = await fetchRiotData(`${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
        if (!accountData) return null;
        
        const { puuid } = accountData;

        // 2. Obter dados do Invocador (ID, ícone)
        const summonerData = await fetchRiotData(`${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`);
        console.log(`Dados recebidos para ${gameName}:`, summonerData);
        if (!summonerData) return null;

        const { id: summonerId, profileIconId } = summonerData;

        // 3. Obter dados de Ranking (Elo)
        const rankData = await fetchRiotData(`${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`);
        if (!rankData) return null;

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
        console.error(`Falha ao buscar dados para ${gameName}#${tagLine}:`, error);
        return null; // Retorna nulo se houver erro para não quebrar a aplicação
    }
}

// Função para ordenar os jogadores por ranking
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

// Função principal que executa tudo
async function main() {
    // Usamos Promise.all para buscar os dados de todos os jogadores em paralelo
    const unsortedPlayers = await Promise.all(playersConfig.map(getPlayerData));
    
    // Filtramos qualquer jogador que tenha retornado erro (null)
    const validPlayers = unsortedPlayers.filter(p => p !== null);

    // Ordenamos os jogadores
    const sortedPlayers = sortPlayers(validPlayers);

    // Esconde a mensagem de "carregando"
    loadingElement.style.display = 'none';

    // Exibe os jogadores na tela
    sortedPlayers.forEach(player => {
        const ddragonVersion = "14.5.1"; // Idealmente, buscar a versão mais recente dinamicamente
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <img class="profile-icon" src="http://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${player.profileIconId}.png" alt="Ícone de Perfil">
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
