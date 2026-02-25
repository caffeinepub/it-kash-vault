import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Game } from '../backend';

export function useGetAllGames() {
  const { actor, isFetching } = useActor();

  return useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllGames();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetGamesByCategory(category: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Game[]>({
    queryKey: ['games', 'category', category],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGamesByCategory(category);
    },
    enabled: !!actor && !isFetching && !!category,
  });
}

export function useIncrementPlayCount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.incrementPlayCount(title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useAddGame() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      category,
      thumbnail,
    }: {
      title: string;
      description: string;
      category: string;
      thumbnail: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.addGame(title, description, category, thumbnail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useGetMostPopularGames(limit: number) {
  const { actor, isFetching } = useActor();

  return useQuery<Game[]>({
    queryKey: ['games', 'popular', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMostPopularGames(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}
