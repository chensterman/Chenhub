<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		SidebarProvider,
		Sidebar,
		SidebarContent,
		SidebarHeader,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupLabel,
		SidebarGroupContent,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		SidebarInset,
		SidebarTrigger,
		SidebarRail,
	} from '$lib/components/ui/sidebar';
	import { Separator } from '$lib/components/ui/separator';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuSub,
		DropdownMenuSubTrigger,
		DropdownMenuSubContent,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import { Images, Mail, ListChecks, LogOut, Sun, Moon, Monitor, ChevronsUpDown, Settings } from '@lucide/svelte';
	import { theme, type Theme } from '$lib/theme.svelte';
	import logoLight from '$lib/assets/logo-light.png';
	import logoDark from '$lib/assets/logo-dark.png';

	let { data, children } = $props();

	const navItems = [
		{ title: 'Scrapbook', href: '/scrapbook', icon: Images },
		{ title: 'Letters', href: '/letters', icon: Mail },
		{ title: 'Bucket List', href: '/bucket-list', icon: ListChecks },
	];

	const user = $derived(data.session?.user);
	const email = $derived(user?.email ?? '');
	const avatarUrl = $derived(user?.user_metadata?.avatar_url ?? '');
	const initials = $derived(
		email
			.split('@')[0]
			.slice(0, 2)
			.toUpperCase()
	);

	const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor },
	];

	async function handleSignOut() {
		await data.supabase.auth.signOut();
		window.location.href = '/login';
	}

	function handleSettingsClick() {
		goto('/settings');
	}
</script>

<SidebarProvider>
	<Sidebar>
		<SidebarHeader>
			<div class="flex items-center justify-center gap-2 px-2 py-2">
				<img src={logoLight} alt="ChenHub" class="h-16 dark:hidden" />
				<img src={logoDark} alt="ChenHub" class="h-16 hidden dark:block" />
			</div>
		</SidebarHeader>

		<SidebarContent>
			<SidebarGroup>
				<SidebarGroupContent>
					<SidebarMenu>
						{#each navItems as item}
							<SidebarMenuItem>
								<SidebarMenuButton isActive={page.url.pathname === item.href}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</SidebarMenuButton>
							</SidebarMenuItem>
						{/each}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</SidebarContent>

		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<SidebarMenuButton
									{...props}
									class="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<Avatar class="size-7 rounded-lg">
										<AvatarImage src={avatarUrl} alt={email} />
										<AvatarFallback class="rounded-lg text-xs">{initials}</AvatarFallback>
									</Avatar>
									<div class="grid flex-1 text-left text-sm leading-tight">
										<span class="truncate font-medium">{email.split('@')[0]}</span>
										<span class="truncate text-xs text-muted-foreground">{email}</span>
									</div>
									<ChevronsUpDown class="ml-auto size-4" />
								</SidebarMenuButton>
							{/snippet}
						</DropdownMenuTrigger>
						<DropdownMenuContent
							class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
							side="top"
							align="start"
							sideOffset={4}
						>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<Sun class="size-4" />
									Theme
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									{#each themeOptions as opt}
										<DropdownMenuItem onclick={() => theme.set(opt.value)}>
											<opt.icon class="size-4" />
											{opt.label}
											{#if theme.value === opt.value}
												<span class="ml-auto text-xs text-muted-foreground">✓</span>
											{/if}
										</DropdownMenuItem>
									{/each}
								</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
						<DropdownMenuItem onclick={handleSettingsClick}>
							<Settings class="size-4" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onclick={handleSignOut}>
							<LogOut class="size-4" />
							Sign Out
						</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarFooter>

		<SidebarRail />
	</Sidebar>

	<SidebarInset>
		<header class="flex items-center p-2">
			<SidebarTrigger class="-ml-1" />
		</header>

		<div class="flex-1 p-4">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
